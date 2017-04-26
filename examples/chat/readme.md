# Not Included
- Client cannot request for new parent
- Server does not keep track of bad actors
- Tree must be stored in memory
- Cannot handle an asyncronous tree
- slim possibility that a websocket reconnects before setImmediate runs
  - can do process.next tick instead
