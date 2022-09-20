const express = require("express");
require("dotenv").config();
const mongoose = require("mongoose");
const ejs = require("ejs");
const bodyParser = require("body-parser");
const session = require("express-session");
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const findOrCreate = require("mongoose-findorcreate");
// const encrypt = require("mongoose-encryption");
// const md5 = require("md5");
// const bcrypt = require("bcrypt");
// const saltRounds = 10;
const app = express();
app.use(express.static("public"))
app.set("view engine","ejs");
app.use(bodyParser.urlencoded({extended:true}));

app.use(session({
    secret: 'Our little secret.',
    resave: false,
    saveUninitialized: false
}))

app.use(passport.initialize());
app.use(passport.session());

mongoose.connect("mongodb://localhost:27017/userDB",{useNewUrlParser: true},(err)=>{
    if(err) return console.log(err);

    console.log("successfully connected..")
});
// mongoose.set("useCreateIndex",true);
const userSchema = new mongoose.Schema({
    email: String,
    password: String,
    googleId: String,
    secret: String
})

userSchema.plugin(passportLocalMongoose);
userSchema.plugin(findOrCreate);
// userSchema.plugin(encrypt,{secret: process.env.SECRET,encryptedFields:["password"]});

const User = new mongoose.model('User',userSchema);

passport.use(User.createStrategy());
passport.serializeUser(function(user,done){
    done(null,user.id);
});
passport.deserializeUser(function(id,done){
    User.findById(id,function(err,user){
        done(err,user)
    })
});

passport.use(new GoogleStrategy({
    clientID: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    callbackURL: "http://localhost:4000/auth/google/secrets",
    
},
function(accessToken, refreshToken,profile,cb){
    console.log(profile);
    User.findOrCreate({googleId:profile.id}, function(err, user){
        return cb(err, user);
    })
}
))

app.get('/',(req,res)=>{
    res.render('home');
})
app.get("/auth/google",passport.authenticate("google",{scope:["profile"]}));
app.get("/auth/google/secrets",passport.authenticate("google",{failureRedirect: "/login"}),
function(req,res){
    // successful authentication, redirect to secrets
    res.redirect('/secrets');
}
)
app.get('/login',(req,res)=>{
    res.render('login');
})
app.get('/register',(req,res)=>{
    res.render('register');
})
app.get("/submit",(req,res)=>{
    if(req.isAuthenticated()){
        res.render("submit");
    }
    else{
        res.redirect("/login")
    }
})

app.post("/submit",(req,res)=>{
    const submittedSecret = req.body.secret;

    User.findById(req.user.id,function(err,foundUser){
        if(err){
            console.log(err);
        }
        else{
            if(foundUser){
                foundUser.secret = submittedSecret;
                foundUser.save(function(){
                    res.redirect("/secrets")
                })
            }

        }
    })
})
app.get("/logout", function(req, res, next) {
    req.logout(function(err) {
      if (err) {
        return next(err);
      }
      res.redirect("/");
    });
  })

  

app.get("/secrets",(req,res)=>{
    // if(req.isAuthenticated()){
    //     res.render("secrets");
    // }
    // else{
    //     res.redirect("/login")
    // }

    User.find({secret:{$ne:null}},function(err,foundUsers){
        if(err){
            console.log(err)
        }
        else{
            if(foundUsers){
                res.render("secrets",{usersWithSecrets:foundUsers})
            }
        }
    })
})
// register or sign up 
app.post('/register',(req,res)=>{
    User.register({username:req.body.username},req.body.password, (err,user)=>{
        if(err){
            console.log(err);
            res.redirect("/register");
        }
        else{
            passport.authenticate("local")(req,res, function(){
                res.redirect("/secrets");
            })
        }
    }) 
})

// login
app.post('/login', (req, res)=>{
   const user = new User(
    {username: req.body.username, 
    password: req.body.password
    });

    req.login(user,(err)=>{
        if(err){
            console.log(err);
        }
        else{
            passport.authenticate("local")(req,res, function(){
                res.redirect("/secrets");
            })
        }
    });
})

app.listen(4000,()=>{
    console.log("Server is listening on port 4000");
})


// ----------login using bcrypt-------------
 // const username = req.body.username;
    // // const password = md5(req.body.password);
    // const password = req.body.password;
    // User.findOne({email:username},(err,foundUser)=>{
    //     if(err){
    //         console.log(err);
    //     }
    //     else{
    //         if(foundUser){
    //            bcrypt.compare(password,foundUser.password, (err,result)=>{
    //             if(result === true){
    //                 res.render('secrets');
    //             }
    //             else{
    //                 res.send("invalid password");
    //             }
    //            })
    //         }
    //         else{
    //             res.send("user not found..")
    //         }
    //     }
    // })


    // -------------- register using bcrypt
    // bcrypt.hash(req.body.password,saltRounds, (err,hash)=>{
        //     const username = req.body.username;
        //     // const password = md5(req.body.password);
        //     const password = hash;
        
        //     const newUser = new User({email: username, password: password});
        //     newUser.save((err)=>{
        //         if(err){
        //             console.log(err.message);
        //         }
        //         else{
        //             res.render('secrets');
        //         }
        //     });
        // })
    