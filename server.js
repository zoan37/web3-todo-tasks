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

const AWS = require("aws-sdk");
const dynamoDB = new AWS.DynamoDB();

const Tasks = require('./tasks.js');

const tasks = new Tasks({
    AWS: AWS,
    dynamoDB: dynamoDB
});

app.get('/', (req, res) => {
    res.send('Hello World!')
})

// TODO: remove logging of user data on server

app.post('/api/createtask', async (req, res) => {
    console.log(req.body);

    tasks.createTask({
        userId: req.body.userId.toLowerCase(),
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

app.get('/api/gettasks', async (req, res) => {
    console.log(req.query);

    tasks.getTasks({
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

app.listen(port, () => {
    console.log(`Example app listening on port ${port}`)
})