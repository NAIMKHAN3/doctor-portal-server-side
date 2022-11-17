const express = require("express");
const cors = require("cors");
const { MongoClient, ServerApiVersion } = require('mongodb');
require('dotenv').config();
const app = express();
const port = process.env.PORT | 5000;

app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
    res.send({ status: true, message: "doctor portal server is runnig" });
});





const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.ujhfrio.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });
const appoinmentOption = client.db('doctor-portal').collection('appoinment-option')
const bookingCollection = client.db('doctor-portal').collection('booking')
async function run() {
    try {
        app.post('/booking', async (req, res) => {
            const booking = req.body;
            const query = {
                date: booking.date,
                email: booking.email,
                treetmentname: booking.treetmentname
            }
            const alreadyBooked = await bookingCollection.find(query).toArray();
            if (alreadyBooked.length) {
                return res.send({ acknowledged: false, message: `you already have a booking on ${booking.date}` })
            }
            const result = await bookingCollection.insertOne(booking);
            res.send(result)
        })
        app.get('/appoinmentoption', async (req, res) => {
            const date = req.query.date;
            // console.log(date)
            try {
                const options = await appoinmentOption.find({}).toArray();
                const alreadyBooked = await bookingCollection.find({ date: date }).toArray();
                options.map(option => {
                    const optionBooked = alreadyBooked.filter(book => book.treetmentname === option.name)
                    // console.log(optionBooked)
                    const bookedSlots = optionBooked.map(book => book.time)
                    const remainingSlots = option.slots.filter(slot => !bookedSlots.includes(slot))
                    option.slots = remainingSlots;



                })
                // console.log(alreadyBooked)
                res.send(options)
            }
            catch {
                res.send({ status: false, message: 'coldnt data found' })
            }
        })

    }
    finally {

    }
}
run().catch(e => console.log(e))


app.listen(port, () => {
    console.log('server is running', port);
});