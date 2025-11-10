const express = require("express");
const cors = require("cors");
const app = express();
const port = process.env.PORT || 3000;

// ------------middleware-------------
app.use(cors());
app.use(express.json());


// ---------------main----------------
app.get('/', (req, res) => {
    res.send({massage: "Server is running."})
})

app.listen(port, () => {
    console.log('Server running on port:', port);
})