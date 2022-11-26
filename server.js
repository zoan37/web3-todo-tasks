const express = require('express')
const compression = require('compression')
const cookieParser = require('cookie-parser')
const app = express()
app.use(express.static('public'));
app.use(compression());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
const port = 3000

require('dotenv').config();

const jwt = require('jsonwebtoken');

const AWS = require("aws-sdk");
const dynamoDB = new AWS.DynamoDB();

const Users = require('./users.js');
const Tasks = require('./tasks.js');

const users = new Users({
    AWS: AWS,
    dynamoDB: dynamoDB
});

const tasks = new Tasks({
    AWS: AWS,
    dynamoDB: dynamoDB
});

app.get('/', (req, res) => {
    res.send('Hello World!')
})

function verifyRequest(req) {
    try {
        var userId; 
        if (req.method == 'GET') {
            userId = req.query.userId;
        } else {
            userId = req.body.userId;
        }
        
        var sessionToken = req.cookies.sessionToken;
    
        var decoded = jwt.verify(sessionToken, process.env.SESSION_TOKEN_SECRET_KEY);

        if (decoded.userId.toLowerCase() != userId.toLowerCase()) {
            throw "UserId mismatch in session token";
        }

        return true;
    } catch (e) {
        return false;
    }
}

// TODO: remove logging of user data on server

app.post('/api/createuser', async (req, res) => {
    console.log(req.body);

    if (!verifyRequest(req)) {
        res.status(401).send("Unauthorized");
        return;
    }

    users.createUser({
        userId: req.body.userId.toLowerCase()
    }, function (err, result) {
        if (err) {
            console.log(err);
            return;
        }

        console.log(result);
        res.send(result);
    });
});

app.get('/api/getuser', async (req, res) => {
    console.log(req.query);

    if (!verifyRequest(req)) {
        res.status(401).send("Unauthorized");
        return;
    }

    users.getUser({
        userId: req.query.userId.toLowerCase()
    }, function (err, result) {
        if (err) {
            console.log(err);
            return;
        }

        console.log(result);
        res.send(result);
    });
});

app.get('/api/getusernonce', async (req, res) => {
    console.log(req.query);

    users.getUserNonce({
        userId: req.query.userId.toLowerCase()
    }, function (err, result) {
        if (err) {
            console.log(err);
            return;
        }

        console.log(result);
        res.send(result);
    });
});

app.post('/api/authenticateuser', async (req, res) => {
    console.log(req.body);

    users.authenticateUser({
        userId: req.body.userId.toLowerCase(),
        signature: req.body.signature
    }, function (err, result) {
        if (err) {
            console.log(err);
            return;
        }

        console.log(result);
        res.send(result);
    });
});

app.post('/api/createtask', async (req, res) => {
    console.log(req.body);

    if (!verifyRequest(req)) {
        res.status(401).send("Unauthorized");
        return;
    }

    tasks.createTask({
        userId: req.body.userId.toLowerCase(),
        encryptionIV: req.body.encryptionIV,
        encryptedData: req.body.encryptedData
    }, function (err, result) {
        if (err) {
            console.log(err);
            return;
        }

        console.log(result);
        res.send(result);
    });
});

app.post('/api/updatetask', async (req, res) => {
    console.log(req.body);

    if (!verifyRequest(req)) {
        res.status(401).send("Unauthorized");
        return;
    }

    tasks.updateTask({
        userId: req.body.userId.toLowerCase(),
        taskId: req.body.taskId,
        isCompleted: req.body.isCompleted,
        encryptedData: req.body.encryptedData,
        order: req.body.order
    }, function (err, result) {
        if (err) {
            console.log(err);
            return;
        }

        console.log(result);
        res.send(result);
    });
});

app.get('/api/gettasks', async (req, res) => {
    console.log(req.query);

    if (!verifyRequest(req)) {
        res.status(401).send("Unauthorized");
        return;
    }

    tasks.getTasks({
        userId: req.query.userId.toLowerCase()
    }, function (err, result) {
        if (err) {
            console.log(err);
            return;
        }

        console.log(result);
        res.send({
            tasks: result
        });
    });
});

app.listen(port, () => {
    console.log(`Example app listening on port ${port}`)
})