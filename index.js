const express = require( 'express' );
const app = express();

const expressWs = require( 'express-ws' )( app );
const aWss = expressWs.getWss('/');


app.use( express.static( 'public' ) );


app.use("/", (req, res) => {
  res.json({message: "HELLO"})
})


const clients = [];
const room = new Array( 255 );

function add( ws, data ) {

  clients.push( {ws, data});

  for ( let i = 0; i < room.length; i ++ ) {
    if ( room[ i ] === undefined ) {
      ws._id = i;
      room[ i ] = {ws, data};
      room.forEach((user, i) => {
        if(user){
          user.data.writeUInt8(user.ws._id, 0)
          user && user.ws !== ws && ws.send(user.data)
        }
      })
      broadcast( ws, data );
      return;
    }
  }


}

function remove( ws ) {

  broadcast(ws, Buffer.from( [ ws._id , 4 ]));


  for (let index = 0; index < clients.length; index++) {
    if(clients[index]?.ws === ws){
      clients.splice(index, 1)
    }    
  }

  for (let index = 0; index < room.length; index++) {
    if(room[index]?.ws === ws){
      room[index] = undefined
    }    
  }

  console.log(clients, room, "REMOVe")
}

function broadcast( ws, data ) {

  for ( let i = 0; i < clients.length; i ++ ) {
      const client = clients[ i ];
    if ( client?.ws !== ws && client?.ws.readyState === client.ws.OPEN ) client?.ws.send( data );
  }

}

app.ws( '/', function ( ws, request ) {

    ws.on( 'close', function () {
        remove( ws );
        broadcast( ws, Buffer.from( [ ws._id , 8 ] ) );
    });
  
    ws.on( 'message', function ( data ) {
        data.writeUInt8( ws._id , 0 );
        if(data[1] === 3){
          add( ws, data );
          broadcast(ws, data)
        }else if(data[1] === 1){
          broadcast( ws, data );
        }else if(data[1] === 4){
          broadcast( ws, data );
        }

    });

} );




const listener = app.listen( 8000 , function () {

  console.log( "Listening on port " + listener.address().port );

} );


