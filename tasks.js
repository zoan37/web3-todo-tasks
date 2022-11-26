const uuid = require('uuid');

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
    
    // TODO: enforce size limit for task
    // TODO: authenticate user before calling createTask
    function createTask(data, callback) {
        var timestamp = Date.now().toString();

        var userId = data.userId;
        var taskId = uuid.v4();
        var encryptionIV = data.encryptionIV;
        var encryptedData = data.encryptedData;

        var params = {
            Item: {
                "UserId": {
                    S: userId
                },
                "TaskId": {
                    S: taskId
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

            console.log("Success", data);

            callback(null, {
                task: AWS.DynamoDB.Converter.unmarshall(params.Item)
            });
        });
    }

    function updateTask(data, callback) {
        var isCompleted = data.isCompleted;

        if (isCompleted == 'true' || isCompleted == 'false') {
            updateTaskState(data, callback)
        }
    }

    function updateTaskState(data, callback) {
        var timestamp = Date.now().toString();

        var userId = data.userId;
        var taskId = data.taskId;
        var isCompleted = data.isCompleted;

        console.log('updateTaskState data');
        console.log(data);

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

        console.log(params);

        dynamoDB.updateItem(params, function (err, data) {
            if (err) {
                callback(err, null);
                return;
            }

            callback(null, data);
        });
    }

    // TODO: authenticate user before calling getTasks
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

    return {
        createTask: createTask,
        getTasks: getTasks,
        updateTask: updateTask
    }
};

module.exports = Tasks;