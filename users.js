const uuid = require('uuid');
const ethSigUtil = require("eth-sig-util");
const jwt = require('jsonwebtoken');

var Tasks = function (config) {

    const AWS = config.AWS;
    const dynamoDB = config.dynamoDB;

    const getAllDataQuery = async (params) => {
        const _getAllData = async (params, startKey) => {
            if (startKey) {
                params.ExclusiveStartKey = startKey
            }
            return dynamoDB.query(params).promise()
        }
        let lastEvaluatedKey = null
        let rows = []
        do {
            const result = await _getAllData(params, lastEvaluatedKey)
            rows = rows.concat(result.Items)
            lastEvaluatedKey = result.LastEvaluatedKey
        } while (lastEvaluatedKey)
        return rows
    }

    function generateAuthenticationNonce() {
        return uuid.v4().replaceAll('-', '');
    }

    function generateEncryptionSalt() {
        return uuid.v4().replaceAll('-', '');
    }
    
    function createUser(data, callback) {
        var timestamp = Date.now().toString();

        var userId = data.userId;
        var authenticationNonce = generateAuthenticationNonce();
        var encryptionSalt = generateEncryptionSalt();

        var params = {
            Item: {
                "UserId": {
                    S: userId
                },
                "AuthenticationNonce": {
                    S: authenticationNonce
                },
                "EncryptionSalt": {
                    S: encryptionSalt
                },
                "CreationTime": {
                    S: timestamp
                },
                "LastUpdateTime": {
                    S: timestamp
                }
            },
            ConditionExpression: 'attribute_not_exists(UserId)',
            TableName: "TodoTasks-Users"
        };

        dynamoDB.putItem(params, function (err, data) {
            if (err) {
                console.log("Error", err);
                callback(err, null);
                return;
            }

            callback(null, data);
        });
    }

    async function getUser(data, callback) {
        var userId = data.userId;

        var params = {
            Key: {
                "UserId": {
                    S: userId
                }
            },
            ConsistentRead: true,
            TableName: "TodoTasks-Users"
        };

        dynamoDB.getItem(params, function (err, data) {
            if (err) {
                callback(err, null);
                return;
            }

            var result = AWS.DynamoDB.Converter.unmarshall(data.Item);

            callback(null, result);
        });
    }

    function getUserNonce(data, callback) {
        getUser(data, function (err, data) {
            if (err) {
                callback(err, null);
                return;
            }

            var result = {};

            if (data.AuthenticationNonce) {
                result.AuthenticationNonce = data.AuthenticationNonce;
            }

            callback(null, result);
        });
    }

    function authenticateUser(data, callback) {
        var userId = data.userId;
        var signature = data.signature;

        this.getUser({ userId: userId }, function (err, user) {
            if (err) {
                callback(err, null);
                return;
            }

            var authenticationNonce = user.AuthenticationNonce;

            const message = "Verify wallet ownership for TodoTasks.xyz\nNonce: " + authenticationNonce;

            const msgParams = {
                data: message,
                sig: signature
            };
            
            var recoveredAddress = ethSigUtil.recoverPersonalSignature(msgParams);

            if (recoveredAddress.toLowerCase() != userId.toLowerCase()) {
                callback("Invalid signature", null);
                return;
            }

            var sessionToken = jwt.sign({ 
                userId: userId,
            }, process.env.SESSION_TOKEN_SECRET_KEY);

            callback(null, {
                sessionToken: sessionToken
            });
        });
    }

    return {
        createUser: createUser,
        getUser: getUser,
        getUserNonce: getUserNonce,
        authenticateUser: authenticateUser
    }
};

module.exports = Tasks;