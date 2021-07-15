require("dotenv").config();
require("./config/database").connect();
const express = require("express");
const jwt = require("jsonwebtoken");
const auth = require("./middleware/auth");
const User = require("./model/user");
const redis = require('redis');
const client = redis.createClient({
    host: process.env.REDIS_HOST,
    port: process.env.REDIS_PORT
});

const app = express();

app.use(express.json());
module.exports = app;

client.on('error', err => {
    console.log('Error ' + err);
});

app.post("/register", async (req, res) => {
    try {
        const {
            userName,
            accountNumber,
            emailAddress,
            identityNumber
        } = req.body;

        if (!(userName && accountNumber && emailAddress && identityNumber)) {
            res
                .status(400)
                .send(
                    JSON.stringify({
                        ErrorMessage: "UserName, Account Number, Email Address, Identity Number is required"
                    })
                )
        }

        const accountNumberExist = await User.findOne({
            accountNumber
        });

        if (accountNumberExist) {
            return res.status(400).send(JSON.stringify({
                ErrorMessage: "This Account Number is Already Exist."
            }));
        }

        const identityNumberExist = await User.findOne({
            identityNumber
        });

        if (identityNumberExist) {
            return res.status(400).send(JSON.stringify({
                ErrorMessage: "This Identity Number is Already Exist."
            }));
        }

        const emailAddressExist = await User.findOne({
            emailAddress
        });

        if (emailAddressExist) {
            return res.status(400).send(JSON.stringify({
                ErrorMessage: "This Email Address is Already Exist."
            }));
        }

        //insert to mongodb
        const user = await User.create({
            userName,
            accountNumber,
            emailAddress: emailAddress.toLowerCase(),
            identityNumber,
        });

        //insert to redis
        client.HMSET(user.emailAddress, 
            {"userName":user.userName, 
            "accountNumber":user.accountNumber, 
            "emailAddress":user.emailAddress,
            "identityNumber":user.identityNumber}, 
            (err, reply) => {
            if (err) throw err;
            console.log("redis: " + reply);
        });

        // const token = jwt.sign({
        //         id: user._id,
        //         emailAddress
        //     },
        //     process.env.TOKEN_KEY, {
        //         expiresIn: "2h",
        //     }
        // );
        // user.accessToken = token;

        res.status(200).json(user);
    } catch (err) {
        console.log(err);
    }
});

app.post("/login", async (req, res) => {
    try {
        const { accountNumber,  identityNumber} = req.body;
    
        if (!(accountNumber && identityNumber)) {
          res.status(400).send("Please fill the account number and identity number");
        }

        const userByAccountNumber = await getUserByAccountNumber(accountNumber); //function to read by identity number
        const userByIdentityNumber = await getUserByIdentityNumber(identityNumber); //function to read by account number
        
        if(userByAccountNumber == null || userByIdentityNumber == null)
        {
            res.status(400).send(JSON.stringify({
                ErrorMessage: "Bad Request"}));
        }

        if (userByAccountNumber.userName == userByIdentityNumber.userName) {
            user = userByAccountNumber;
            const token = jwt.sign(
            { user_id: user._id, emailAddress: user.emailAddress},
            process.env.TOKEN_KEY,
            {
              expiresIn: "2h",
            }
          );
          user.accessToken = token;
          res.status(200).json(user);
        }
        else
        {
            res.status(400).send(JSON.stringify({ErrorMessage: "Bad Request"}));
        }
      } catch (err) {
        console.log(err);
        res.status(500).send(JSON.stringify({
            ErrorMessage: "Internal Server Error"}));
      }
});


app.put("/update", auth, async (req, res) => {
    try {
        const { emailAddress, accountNumber,  identityNumber} = req.body;
        
        const user = await User.findOneAndUpdate({emailAddress: emailAddress}, {$set:{accountNumber, identityNumber}},{new:true});

        if(user != null)
        {
            client.HMSET(user.emailAddress, 
                {"userName":user.userName, 
                "accountNumber":user.accountNumber,
                "identityNumber":user.identityNumber}, 
                (err, reply) => {
                if (err) throw err;
                console.log("redis: " + reply);
            });

            user.accessToken = req.headers['x-access-token'];
            res.status(200).json(user);
        }
        else
        {
            res.status(400).send(JSON.stringify({ErrorMessage: "Bad Request"}));
        }
      } catch (err) {
        console.log(err);
        res.status(500).send(JSON.stringify({ErrorMessage: "Internal Server Error"}));
      }
});

app.delete("/delete", auth, async (req, res) => {
    try {
        const { emailAddress } = req.body;
        
        const user = await User.findOneAndRemove({emailAddress: emailAddress});

        console.log(user);
        if(user != null)
        {
            client.DEL(user.emailAddress, (err, reply) => {
                if (err) throw err;
                console.log("redis: " + reply);
            });

            res.status(400).send(JSON.stringify({ErrorMessage: "Data Deleted Successfully"}));
        }
        else
        {
            res.status(400).send(JSON.stringify({ErrorMessage: "Bad Request"}));
        }

      } catch (err) {
        console.log(err);
      }
});

app.get("/dashboard/:emailAddress", auth, async (req, res) => {
    try {
        client.HMGET(req.params.emailAddress, "userName", (err, reply) => {
            if(err != null)
            {
                throw err;
            }

            res.status(200).send(JSON.stringify({Message : "Welcome " + reply}));
        });
      } catch (err) {
        console.log(err);
        res.status(500).send(JSON.stringify({Message : "Internal Server Error"}));
      }
});

async function getUserByAccountNumber(accountNumber)
{
    return User.findOne({ accountNumber });
}

async function getUserByIdentityNumber(identityNumber)
{
    return User.findOne({ identityNumber });
}