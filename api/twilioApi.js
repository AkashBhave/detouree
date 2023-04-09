const { User, BP, Obstacle, dbinit } = require("./db");
const twilio = require('twilio');
const accountSid = 'ACd612f3b9d470d90d1c48c781b9cc2992'; // Your Account SID from www.twilio.com/console
const authToken = '4474d854f683124a0439f394e12d33b9'; // Your Auth Token from www.twilio.com/console


const client = require('twilio')(accountSid, authToken);

function obstacleAdded (payload){
  try {
    
    client.messages
      .create({
        body: `Hello, there has been a change with the optimal path from ${payload.building1}to ${payload.building2}}`,
        to: payload.phone,
        // to: '+15718882122', // Text this number
        from: '18449832883', // From a valid Twilio number
      })
      .then((message) => console.log(message.sid))
      .catch((error) => console.log(error));
  } catch (error) {
    throw error
  }

}

function updateUsers(userList){
  for(let i = 0; i<length(userList); i++){
    obstacleAdded(userList[i])
  }
}

export {updateUsers, obstacleAdded}

// function parseDB (){
//   const text = `SELECT * FROM BP`
  

//   print(result)

// }
