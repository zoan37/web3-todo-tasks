const uuid = require('uuid');

var Tasks = function (config) {

    const MAX_TASK_DATA_LENGTH = 10000;
    const MAX_IV_LENGTH = 16;
    const MAX_USER_ID_LENGTH = 100;

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

    function createTask(data, callback) {
        var timestamp = Date.now().toString();

        var userId = data.userId;
        var taskId = uuid.v4();
        var encryptionIV = data.encryptionIV;
        var encryptedData = data.encryptedData;

        if (userId.length > MAX_USER_ID_LENGTH) {
            callback('UserId is too large', null);
            return;
        }
        if (encryptionIV.length > MAX_IV_LENGTH) {
            callback('Encryption IV is too large', null);
            return;
        }
        if (encryptedData.length > MAX_TASK_DATA_LENGTH) {
            callback('Encrypted data is too large', null);
            return;
        }

        var params = {
            Item: {
                "UserId": {
                    S: userId
                },
                "TaskId": {
                    S: taskId
                },
                "ListId": {
                    S: 'default' // hardcoded for now
                },
                "EncryptionIV": {
                    S: encryptionIV
                },
                "EncryptedData": {
                    S: encryptedData
                },
                "IsCompleted": {
                    BOOL: false
                },
                "Order": {
                    N: timestamp
                },
                "CreationTime": {
                    S: timestamp
                },
                "LastUpdateTime": {
                    S: timestamp
                }
            },
            TableName: "TodoTasks-Tasks"
        };

        dynamoDB.putItem(params, function (err, data) {
            if (err) {
                console.log("Error", err);
                callback(err, null);
                return;
            }

            callback(null, {
                task: AWS.DynamoDB.Converter.unmarshall(params.Item)
            });
        });
    }

    function updateTask(data, callback) {
        var isCompleted = data.isCompleted;
        var encryptedData = data.encryptedData;
        var order = data.order;

        if (isCompleted == 'true' || isCompleted == 'false') {
            updateTaskState(data, callback);
        } else if (encryptedData) {
            updateTaskEncryptedData(data, callback);
        } else if (order) {
            updateTaskOrder(data, callback);
        }
    }

    function updateTaskState(data, callback) {
        var timestamp = Date.now().toString();

        var userId = data.userId;
        var taskId = data.taskId;
        var isCompleted = data.isCompleted;

        var params = {
            TableName: "TodoTasks-Tasks",
            Key: {
                "UserId": {
                    S: userId
                },
                "TaskId": {
                    S: taskId
                },
            },
            UpdateExpression: "set #C = :c, #LUT = :t",
            ExpressionAttributeNames: {
                "#C": "IsCompleted",
                "#LUT": "LastUpdateTime"
            },
            ExpressionAttributeValues: {
                ":c": {
                    BOOL: isCompleted == 'true'
                },
                ":t": {
                    S: timestamp
                }
            }
        };

        dynamoDB.updateItem(params, function (err, data) {
            if (err) {
                callback(err, null);
                return;
            }

            callback(null, data);
        });
    }

    function updateTaskEncryptedData(data, callback) {
        var timestamp = Date.now().toString();

        var userId = data.userId;
        var taskId = data.taskId;
        var encryptedData = data.encryptedData;

        if (encryptedData.length > MAX_TASK_DATA_LENGTH) {
            callback('Encrypted data is too large', null);
            return;
        }

        var params = {
            TableName: "TodoTasks-Tasks",
            Key: {
                "UserId": {
                    S: userId
                },
                "TaskId": {
                    S: taskId
                },
            },
            UpdateExpression: "set #D = :d, #LUT = :t",
            ExpressionAttributeNames: {
                "#D": "EncryptedData",
                "#LUT": "LastUpdateTime"
            },
            ExpressionAttributeValues: {
                ":d": {
                    S: encryptedData
                },
                ":t": {
                    S: timestamp
                }
            }
        };

        dynamoDB.updateItem(params, function (err, data) {
            if (err) {
                callback(err, null);
                return;
            }

            callback(null, data);
        });
    }

    function updateTaskOrder(data, callback) {
        var timestamp = Date.now().toString();

        var userId = data.userId;
        var taskId = data.taskId;
        var order = data.order;

        var params = {
            TableName: "TodoTasks-Tasks",
            Key: {
                "UserId": {
                    S: userId
                },
                "TaskId": {
                    S: taskId
                },
            },
            UpdateExpression: "set #O = :o, #LUT = :t",
            ExpressionAttributeNames: {
                "#O": "Order",
                "#LUT": "LastUpdateTime"
            },
            ExpressionAttributeValues: {
                ":o": {
                    S: order
                },
                ":t": {
                    S: timestamp
                }
            }
        };

        dynamoDB.updateItem(params, function (err, data) {
            if (err) {
                callback(err, null);
                return;
            }

            callback(null, data);
        });
    }

    async function getTasks(data, callback) {
        var userId = data.userId;

        var params = {
            ExpressionAttributeNames: {
                "#U": "UserId"
            },
            ExpressionAttributeValues: {
                ":u": {
                    S: userId
                }
            },
            KeyConditionExpression: "#U = :u",
            ConsistentRead: true,
            TableName: "TodoTasks-Tasks"
        };

        var allData = null;
        try {
            allData = await getAllDataQuery(params);
        } catch (e) {
            callback(e, null);
            return;
        }

        var result = [];

        for (var i = 0; i < allData.length; i++) {
            var item = AWS.DynamoDB.Converter.unmarshall(allData[i]);
            result.push(item);
        }

        callback(null, result);
    }

    function deleteTask(data, callback) {
        var userId = data.userId;
        var taskId = data.taskId;

        var params = {
            Key: {
                "UserId": {
                    S: userId
                },
                "TaskId": {
                    S: taskId
                },
            },
            TableName: "TodoTasks-Tasks"
        };

        dynamoDB.deleteItem(params, function (err, data) {
            if (err) {
                callback(err, null);
                return;
            }

            callback(null, data);
        });
    }

    return {
        createTask: createTask,
        getTasks: getTasks,
        updateTask: updateTask,
        deleteTask: deleteTask
    }
};

module.exports = Tasks;