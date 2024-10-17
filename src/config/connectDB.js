const mysql = require("mysql2/promise");

// const connection = mysql.createPool({
//   host: "localhost",
//   user: "root",
//   password: "",
//   database: "wingo68",
// });
const connection = mysql.createPool({
  host: "103.68.109.38",
  user: "wingo",
  password: "wingo",
  database: "wingo",
});
export default connection;
