const express = require('express');
const cors = require('cors');
const mongoose = require("mongoose");
const User = require('./models/User');
const Place = require('./models/Place');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');
const imageDownloader = require('image-downloader');
const multer = require('multer');
const fs = require('fs');
const Booking = require('./models/Booking.js');
require('dotenv').config()
const app = express();

const bcrptSalt = bcrypt.genSaltSync(10);
const jwtSecret = "ifjasfi189t1298fn981fn98jf98af98q"


app.use(express.json());
app.use(cookieParser());
app.use('/uploads', express.static('C:/Users/ROG/WebstormProjects/BookingApp/api/uploads/'))
app.use(cors({
    credentials:true,
    origin:'http://localhost:5173',
}));
mongoose.connect(process.env.MONGO_URL);
function getUserDataFromReq(req) {
    return new Promise((resolve, reject) => {
        jwt.verify(req.cookies.token, jwtSecret, [], async (err, userData) => {
            if (err) throw err;
            resolve(userData);
        });
    });

}

app.get('/test',(req,res,) => {
    res.json('test ok')
});

app.post('/register',async(req,res) => {
    const {name,email,password} = req.body;

    try {
        const userDoc = await User.create({
            name,
            email,
            password:bcrypt.hashSync(password,bcrptSalt),
        });
        res.json(userDoc);
    } catch (e) {
        res.status(422).json(e);
    }
});

app.post('/login', async (req,res) => {
    mongoose.connect(process.env.MONGO_URL);
    const {email,password} = req.body;
    if (!email || !password) {
        res.status(400).json('Please provide valid email and password');
        return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        res.status(400).json('Please provide valid email');
        return;
    }
    const passwordRegex = /^(?=.*\d)(?=.*[a-z])(?=.*[A-Z])(?=.*[a-zA-Z]).{8,}$/;
    if (!passwordRegex.test(password)) {
        res.status(400).json('Please provide valid password');
        return;
    }
    const userDoc = await User.findOne({email});
    if (userDoc) {
        const passOk = bcrypt.compareSync(password, userDoc.password);
        if (passOk) {
            jwt.sign({
                email:userDoc.email,
                id:userDoc._id
            }, jwtSecret, {}, (err,token) => {
                if (err) throw err;
                res.cookie('token', token).json(userDoc);
            });
        } else {
            res.status(422).json('pass not ok');
        }
    } else {
        res.json('not found');
    }
});

app.get('/profile', (req,res) => {
    mongoose.connect(process.env.MONGO_URL);
    const {token} = req.cookies;
    if (token) {
        jwt.verify(token, jwtSecret, {}, async (err, userData) => {
            if (err) throw err;
            const {name,email,_id} = await User.findById(userData.id);
            res.json({name,email,_id});
        });
    } else {
        res.json(null);
    }
});

app.post('/logout', (req,res) => {
    res.cookie('token', '').json(true);
});

app.post('/upload-by-link', async ( req , res ) => {

    const { link } = req.body;
    const newName = 'photo' + Date.now() + '.jpg';
    await imageDownloader.image ({
        url: link ,
        dest: 'C:/Users/ROG/WebstormProjects/BookingApp/api/uploads/' + newName,
    });
res.json(newName);
});

const photosMiddleware = multer({dest:'uploads'})
app.post('/upload',photosMiddleware.array('photos', 100), (req, res) => {
    const uploadedFiles= [];
    for (let  i = 0; i < req.files.length; i++){
        const {path, originalname} = req.files[i];
        const parts = originalname.split('.');
        const ext = parts[parts.length - 1];
        const newPath = path + '.' + ext;
        fs.renameSync(path, newPath);
        uploadedFiles.push(newPath.replace('uploads', '').replace(',', ' '));
    }
res.json(uploadedFiles);
});

app.post('/places', (req, res) =>{
    const {token} = req.cookies;
    const {
        title,address,addedPhotos,description,price,
        perks,extraInfo,checkIn,checkOut,maxGuests,
    } = req.body;
    jwt.verify(token, jwtSecret, {}, async (err, userData) => {
        if (err) throw err;
      const placeDoc = await Place.create({
            owner: userData.id,price,
           title,address,photos:addedPhotos,description,
           perks,extraInfo,checkIn,checkOut,maxGuests,
        });
        res.json(placeDoc);
    });
});

app.get('/user-places', (req, res) =>{
    const {token} = req.cookies;
    jwt.verify(token, jwtSecret, {}, async (err, userData) => {
        const {id} = userData;
        res.json(await Place.find({owner:id}) );

    });
    });
app.get('/places/:id', async (req , res) => {
    const {id}=req.params;
    res.json(await Place.findById(id));
});

app.put('/places', async (req, res) =>{
    const {token} = req.cookies;
    const {
        id,
        title,address,addedPhotos,description,
        perks,extraInfo,checkIn,checkOut,maxGuests,price,
    } = req.body;
    jwt.verify(token, jwtSecret, {}, async (err, userData) => {
        if (err) throw err;
        const placeDoc = await Place.findById(id);
        if (userData.id === placeDoc.owner.toString()) {
            placeDoc.set({
                title,address,photos:addedPhotos,description,
                perks,extraInfo,checkIn,checkOut,maxGuests,price,
            });
           await placeDoc.save();
            res.json('ok');
        }
    });
    });

app.get('/places', async (req , res) => {
    res.json(await Place.find());
})

app.post('/bookings', async (req , res) => {
    const userData = await getUserDataFromReq(req);
    const {
        place , checkIn , checkOut ,
        numberOfGuests , name , phone , price,
    }=req.body;
    Booking.create({
        place , checkIn , checkOut ,
        numberOfGuests , name , phone , price,
        user:userData.id,
    }).then((doc) => {
        res.json(doc);
    }).catch((err) => {
        throw err;
    });
});



app.get('/bookings/', async (req, res) => {
 const userData = await getUserDataFromReq(req);
 res.json( await Booking.find({user:userData.id}).populate('place') );

});

app.listen(4000);

