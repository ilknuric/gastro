const express = require("express");
const router = express.Router();
const axios = require('axios');
const bcrypt = require("bcryptjs");
const ejs = require("ejs");
const path = require("path");
const nodemailer = require("nodemailer");

const winston = require("winston");
const Business = require("../models/businessModel");
const Reviews = require("../models/reviewModel");
const Service = require("../models/serviceModel");
const Faq = require("../models/faqModel");
const Agb = require("../models/agbModel");
const Impressum = require("../models/impressumModel");
const User = require("../models/userModel");
const Orders = require("../models/orderModel");
const Workers = require("../models/workerModel");
const ScheduleModel = require("../models/calendarModel");
const Category = require("../models/categoryModel");
const About = require("../models/aboutModel");
const Product = require("../models/productModel");
const Fav = require("../models/favModel");
const Order = require("../models/orderModel");
const Application = require("../models/appModel");
const Coupon = require("../models/promoModel");
const Campaign = require("../models/campaignModel");
const Process = require("../models/processModel");
const Mwst = require("../models/mwstModel");
const Slide = require("../models/slideModel");
const Package = require("../models/packageModel");
const Brand = require("../models/brandModel");

function requireLogin(req, res, next) {
        if (req.session && req.session.userId) {
                next();
        } else {
                res.redirect("/login");
        }
}
const transporter = nodemailer.createTransport({
        host: "mail.eatorder.ch",
        port: 465,
        secure: true,
        auth: {
		user: 'test@g-itsolutions.ch',
	        pass: '5$Wu58un',
        },
        tls: {
                rejectUnauthorized: false,
        },
});
function isDateBetween(date, startDate, endDate) {
        return date >= startDate && date <= endDate;
}
function generateRandomPassword() {
        const characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
        let newPassword = "";
        for (let i = 0; i < 12; i++) {
                newPassword += characters.charAt(Math.floor(Math.random() * characters.length));
        }
        return newPassword;
}
function generateOrderNumber() {
        const random = Math.floor(Math.random() * 9900000) + 100000;
        return random;
}
const logger = winston.createLogger({
    level: "error", 
    format: winston.format.json(),
    transports: [
        new winston.transports.Console(),
        new winston.transports.File({ filename: path.join(__dirname, '..', 'error.log') }),
    ],
});
//PAGES
router.get("/", async (req, res, next) => {
        try {
            const userID = req.session.userId;
            const slides = await Slide.find();
            const categories = await Category.find();
            const campaigns = await Campaign.find();
            const reviews = await Reviews.find();
            const business = await Business.find();
            const today = new Date();
    
            const activeCampaigns = campaigns.filter(campaign => {
                const startDate = new Date(campaign.campaignStartDate);
                const endDate = new Date(campaign.campaignEndDate);
                return startDate <= today && endDate >= today;
            });
    
            const packages = await Package.find();
            const orderItemsAggregation = await Order.aggregate([
                { $unwind: "$orderItems" },
                {
                    $group: {
                        _id: "$orderItems._id", 
                        totalQuantity: { $sum: { $toInt: "$orderItems.quantity" } } 
                    }
                },
                { $sort: { totalQuantity: -1 } },
                { $limit: 10 } 
            ]);
    
            const topSellingProductIDs = orderItemsAggregation.map(item => item._id);
    
            const products = await Product.find({
                _id: { $in: topSellingProductIDs },
                status: "Active"
            });
            let productsWithDetails = products.map(product => {
                const campaignDetail = activeCampaigns
                    .flatMap(campaign => campaign.campaignDetails)
                    .find(detail => detail.productID === product._id.toString());
    
                const discountPercentage = campaignDetail
                    ? Math.round(
                          ((campaignDetail.currentPrice - campaignDetail.campaignPrice) /
                              campaignDetail.currentPrice) *
                              100
                      )
                    : null;
    
                const packageDetail = packages.find(pkg => pkg._id.toString() === product.package);
    
                return {
                    ...product.toObject(),
                    campaignDetail: campaignDetail || null,
                    discountPercentage: discountPercentage,
                    packageName: packageDetail ? packageDetail.packageName : "Unknown",
                };
            });
            productsWithDetails = productsWithDetails.slice(0, 10);
            res.locals.req = req;
            res.locals.activePage = "index";
            res.render("index", {slides,userID,categories,products: productsWithDetails,campaigns: activeCampaigns,business,reviews});
        } catch (err) {
            console.error(err);
            if (err.name === "CastError" && err.kind === "ObjectId") {
                res.status(404);
                return res.render("404");
            }
            logger.error("Error Log:", err);
            res.status(404);
            return res.render("404");
        }
});
    
      
router.get("/faq", async (req, res) => {
        try {
                const userID=req.session.userId;
                const business = await Business.find();
                const faq = await Faq.find();
                res.locals.req = req;
                res.locals.activePage = "faq";
                res.render("faq", { faq,userID,business });
        } catch (err) {
                console.error("Error in /faq route:", err);
                if (err.name === 'CastError' && err.kind === 'ObjectId') {
                    res.status(404);
                    return res.render('404');
                }
                logger.error("Error Log:", err);
                res.status(500).send("Internal Server Error");
        }
});
router.get("/uber-uns", async (req, res) => {
        try {
                const userID=req.session.userId;
                const business = await Business.find();
                const about = await About.find();
                const processes = await Process.find();
                res.locals.req = req;
                res.locals.activePage = "uber-uns";
                res.render("uber-uns", { about, processes,userID,business });
        } catch (err) {
                console.error("Error in /about route:", err);
                if (err.name === 'CastError' && err.kind === 'ObjectId') {
                    res.status(404);
                    return res.render('404');
                }
                logger.error("Error Log:", err);
                res.status(500).send("Internal Server Error");
        }
});
router.get("/agb", async (req, res) => {
        try {
                const userID=req.session.userId;
                const business = await Business.find();
                const agb = await Agb.find();
                res.locals.req = req;
                res.locals.activePage = "agb";
                res.render("agb", { agb,userID,business });
        } catch (err) {
                console.error("Error in /agb route:", err);
                if (err.name === 'CastError' && err.kind === 'ObjectId') {
                    res.status(404);
                    return res.render('404');
                }
                logger.error("Error Log:", err);
                res.status(500).send("Internal Server Error");
        }
});
router.get("/impressum", async (req, res, next) => {
        try {
            const userID=req.session.userId;
            const business = await Business.find();
            const impressum = await Impressum.find();
            res.locals.req = req;
            res.locals.activePage = "impressum";
            res.render("impressum", { impressum,userID,business });
        } catch (err) {
            console.error("Error in /impressum route:", err);
            if (err.name === 'CastError' && err.kind === 'ObjectId') {
                res.status(404);
                return res.render('404');
            }
            logger.error("Error Log:", err);
            res.status(500).send("Internal Server Error");
        }
});   
router.get("/contact", async (req, res) => {
        try {
                const userID=req.session.userId;
                const business = await Business.find();
		const recaptchaSiteKey = process.env.RECAPTCHA_SITE_KEY;
                res.locals.req = req;
                res.locals.activePage = "contact";
                res.render("contact",{recaptchaSiteKey,userID,business});
        } catch (err) {
                console.error("Error in /contact route:", err);        
                if (err.name === 'CastError' && err.kind === 'ObjectId') {
                    res.status(404);
                    return res.render('404');
                }        
                logger.error("Error Log:", err);
                res.status(500).send("Internal Server Error");
        }
});
router.post("/contact", async (req, res) => {
        try {
            const { email, name, subject, message,userLoc } = req.body;

		if (userLoc!== "CH") {
	        res.redirect("/contact?no");
        } else {	
                const templatePath = path.join(__dirname, "mail/contactEmail.ejs");
                const templateOwnerPath = path.join(__dirname, "mail/contactOwnerEmail.ejs");
                const renderedHtml = await ejs.renderFile(templatePath, { name, email, subject, message });
                const renderedOwnerHtml = await ejs.renderFile(templateOwnerPath, { name, email, subject, message });

                const mailOptions = {
                        from: "metime@metime-schweiz.ch",
                        to: email,
                        subject: 'Zeit für die Einreichung des Kontaktformulars',
                        html: renderedHtml,
                };

                const ownerMailOptions = {
                        from: email,
                        to: "metime@metime-schweiz.ch",
                        subject: 'Zeit für mich Neue Nachricht von der Übermittlung des Kontaktformulars',
                        html: renderedOwnerHtml,
                };

                await transporter.sendMail(mailOptions);
                await transporter.sendMail(ownerMailOptions);
                res.redirect("/contact?success");
        }    
        } catch (error) {
                return res.redirect("../404");
        }
});  
router.get("/404", (req, res) => {
        res.locals.req = req;
        res.locals.activePage = "404";
        res.render("404");
});
//USER PAGES
router.get("/register", async (req, res) => {
        if (req.session.userId) {
                return res.redirect("/dashboard");
        }
        const userID=req.session.userId;
        const business = await Business.find();
        res.locals.req = req;
        res.locals.activePage = "register";
        res.render("register",{userID,business});
});
router.post("/signup", async (req, res, next) => {
        try {
            const { email, password,localStorageValue } = req.body;
            const existingUser = await User.findOne({ email });
    
            if (existingUser) {
                req.session.registrationError = "E-Mail wird bereits verwendet. Bitte wählen Sie eine andere E-Mail.";
                return res.redirect("/register");
            }
    
            const hashedPassword = await bcrypt.hash(password, 10);
            const newUser = await User.create({ email, password: hashedPassword });
    
            if (!newUser) {
                req.session.registrationError = "Es gab ein Problem bei der Registrierung. Bitte versuchen Sie es erneut.";
                return res.redirect("/register");
            }
    
            req.session.userId = newUser._id;
	        if (localStorageValue && localStorageValue !== "") {
		        return res.redirect("/checkout");
		}else {
	            return res.redirect("/dashboard");
		}

        } catch (err) {
            console.error("Error in /signup route:", err);
            req.session.registrationError = "Es gab ein unerwartetes Problem bei der Registrierung. Bitte versuchen Sie es erneut.";
            return res.redirect("/register");
        }
});
router.post("/signin", async (req, res) => {
        try {
            const { email, password,localStorageValue } = req.body;
            const user = await User.findOne({ email });
    
            if (!user) {
                req.session.loginError = "Benutzer nicht gefunden";
                return res.redirect("/login");
            }
            const isPasswordMatch = await bcrypt.compare(password, user.password);
            if (isPasswordMatch) {
                req.session.userId = user._id;
                delete req.session.loginError;
    
                const redirectUrl = req.session.redirectTo || "/";
                delete req.session.redirectTo;
				
                if (localStorageValue && localStorageValue !== "") {
                return res.redirect("/checkout");
                }else {
                res.redirect(redirectUrl);
                }
            } else {
                req.session.loginError = "Falsches Passwort";
                return res.redirect("/login");
            }
        } catch (error) {
            console.error("Error during sign-in:", error);
            req.session.loginError = "Ein Fehler ist aufgetreten. Bitte kontaktieren Sie uns!";
            return res.redirect("/login");
        }
});    
router.get("/login", async (req, res) => {
        if (req.session.userId) {
                return res.redirect("/dashboard");
        }
        const userID=req.session.userId;
        const loginError = req.session.loginError;
        const loginSuccess = req.session.loginSuccess;
        const business = await Business.find();
        req.session.loginError = null;
        req.session.loginSuccess = null;
        req.session.redirectTo = req.header("Referer") || "/";
        res.locals.req = req;
        res.locals.activePage = "login";
        res.render("login", { loginError, loginSuccess, userID,business });
});
router.get("/forgot-password", async (req, res) => {
        const loginError = req.session.loginError;
        const loginSuccess = req.session.loginSuccess;
        const business = await Business.find();
        req.session.loginError = null;
        req.session.loginSuccess = null;
        const userID=req.session.userId;
        res.locals.req = req;
        res.locals.activePage = "forgot-password";
        res.render("forgot-password", { loginError, loginSuccess,userID,business});
});
router.post("/forgot-password", async (req, res) => {
        try {
            const { email } = req.body;
            const user = await User.findOne({ email });
    
            if (!user) {
                req.session.loginError = "Benutzer nicht gefunden";
                return res.redirect("/login#recover");
            }
    
            const newPassword = generateRandomPassword();
            const hashedPassword = await bcrypt.hash(newPassword, 10);
            user.password = hashedPassword;
            await user.save();
    
            const templatePath = path.join(__dirname, "mail/userPasswordReset.ejs");
            const renderedHtml = await ejs.renderFile(templatePath, { email, password: newPassword });
            const customerMailOptions = {
                from: "metime@metime-schweiz.ch",
                to: user.email,
                subject: 'me Zeit Passwort zurücksetzen',
                html: renderedHtml,
            };
    
            await transporter.sendMail(customerMailOptions);
            delete req.session.loginError;
            delete req.session.loginSuccess;
    
            req.session.loginSuccess = "Neues Passwort an Ihre E-Mail gesendet";
            res.redirect("/login#recover");
        } catch (error) {
            console.error("Error during password reset:", error);
            req.session.loginError = "Ein Fehler ist aufgetreten. Bitte kontaktieren Sie uns!";
            res.redirect("/login#recover");
        }
});    
router.get("/logout", async (req, res) => {
        res.locals.req = req;
        res.locals.activePage = "index";
        delete req.session.userId;
        res.redirect("/");
});
router.get("/dashboard", requireLogin, async (req, res) => {
        try {
                const userID=req.session.userId;
                const profileError = req.session.profileError;
                const profileSuccess = req.session.profileSuccess;
                const business = await Business.find();
                req.session.profileError = null;
                req.session.profileSuccess = null;
                const userId = req.session.userId;
                const user = await User.findById(userId);
                if (!user) {
                        return res.redirect("../404");
                }
                const passwordError = req.session.passwordError;
                req.session.passwordError = null;

                res.locals.req = req;
                res.locals.activePage = "dashboard";
                res.render("dashboard", {user,passwordError,profileSuccess,profileError,userID,business});
        } catch (err) {
                return res.redirect("../404");
        }
});
router.get("/user-address", requireLogin, async (req, res) => {
        try {
            const userID = req.session.userId;
            const business = await Business.find();
            const user = await User.findById(userID);    
            if (!user) {
                return res.redirect("../404");
                }
            res.locals.req = req;
            res.locals.activePage = "user-address";
            res.render("user-address", { user,userID,business });
        } catch (err) {
                return res.redirect("../404");
        }
});    
router.get("/user-account", requireLogin, async (req, res) => {
        try {
            const userID = req.session.userId;
            const business = await Business.find();
            const user = await User.findById(userID);    

            if (!user) {
                return res.redirect("../404");
                }
            res.locals.req = req;
            res.locals.activePage = "user-account";
            res.render("user-account", { user,userID,business });
        } catch (err) {
                return res.redirect("../404");
        }
});    
router.get("/user-password", requireLogin, async (req, res) => {
        try {
            const userID = req.session.userId;
            const business = await Business.find();
            const user = await User.findById(userID);    
            if (!user) {
                return res.redirect("../404");
                }

                const passwordError = req.session.passwordError;
                req.session.passwordError = null;
            res.locals.req = req;
            res.locals.activePage = "user-password";
            res.render("user-password", { user,passwordError,userID,business });
        } catch (err) {
                return res.redirect("../404");
        }
});    
router.post("/profile", async (req, res) => {
        try {
                const userId = req.session.userId;
                const user = await User.findById(userId);

                if (!user) {
                        return res.redirect("../404");
                }
                user.name = req.body.name;
                user.surname = req.body.surname;
                user.gsm = req.body.gsm;
                user.email = req.body.email;
                await user.save();
                req.session.profileSuccess = "Informationen erfolgreich aktualisiert";
                res.redirect("/user-account?ok");
        } catch (err) {
                return res.redirect("../404");
        }
});
router.post("/user-address", async (req, res) => {
        try {
                const userId = req.session.userId;
                const user = await User.findById(userId);

                if (!user) {
                        return res.redirect("../404");
                }
		user.street = req.body.street;
                user.no = req.body.no;
                user.postcode = req.body.postcode;
                user.ort = req.body.ort;
                await user.save();
                req.session.profileSuccess = "Informationen erfolgreich aktualisiert";
                res.redirect("/user-address?ok");
        } catch (err) {
                return res.redirect("../404");
        }
});
router.post("/password", async (req, res) => {
        try {
                const userId = req.session.userId;
                const user = await User.findById(userId);
                if (!user) {
                        return res.redirect("../404");
                }
                const currentPasswordMatch = await bcrypt.compare(req.body.current_password,user.password);

                if (!currentPasswordMatch) {
                        req.session.passwordError ="Das Passwort ist falsch";
                        return res.redirect("/user-password?wrongpass");
                }

                if (req.body.new_password_one !== req.body.new_password_two) {
                        req.session.passwordError ="Neue Passwörter stimmen nicht überein";
                        return res.redirect("/user-password?match");
                }

                const hashedPassword = await bcrypt.hash(req.body.new_password_one,10);
                user.password = hashedPassword;
                await user.save();

                req.session.regenerate(() => {
                        req.session.userId = user._id;
                        req.session.successMessage ="Das Passwort wurde erfolgreich geändert";
                        res.redirect("/user-password?ok");
                });
        } catch (err) {
                return res.redirect("../404");
        }
});
router.get("/order-history", requireLogin, async (req, res) => {
        try {
                const userID = req.session.userId;
                const business = await Business.find();
                const user = await User.findById(userID);
                const orders = await Order.find({ userID: userID }).sort({ createdAt: -1 });
                const formattedOrders = orders.map(order => {
                        const createdAt = new Date(order.createdAt).toLocaleDateString("en-GB");
                        const totalPrice = order.orderItems.reduce((sum, item) => sum + parseFloat(item.price), 0);
                    
                        return {
                            ...order.toObject(),
                            createdAt,
                            totalPrice: totalPrice.toFixed(2) 
                        };
                });
                if (!user) {
                        return res.redirect("../404");
                }
                res.locals.req = req;
                res.locals.activePage = "order-history";
                res.render("order-history", {user,orders:formattedOrders,userID,business});
        } catch (err) {
                console.error(err);
                return res.redirect("../404");
        }
});
router.get("/order-detail/:orderID", requireLogin, async (req, res) => {
    try {
        const userID = req.session.userId;
        const orderID = req.params.orderID;
        const business = await Business.find();
        const user = await User.findById(userID);
        const orders = await Order.findOne({ _id: orderID });

        if (!user || !orders) {
            return res.redirect("../404");
        }
        const mwstGrouped = {};
        let totalMwst = 0;

        orders.orderItems.forEach(item => {
            const { mwstName, mwstValue } = item;
            if (!mwstGrouped[mwstName]) {
                mwstGrouped[mwstName] = 0;
            }
            mwstGrouped[mwstName] += parseFloat(mwstValue);
            totalMwst += parseFloat(mwstValue);
        });
        const subtotal = parseFloat(orders.orderPrice) - totalMwst;
        res.locals.req = req;
        res.locals.activePage = "order-detail";
        res.render("order-detail", {user,orders,userID,business,mwstGrouped,totalMwst,subtotal});
    } catch (err) {
        console.error(err);
        return res.redirect("../404");
    }
});

//LISTING
router.get("/shop", async (req, res) => {
        try {
            const page = parseInt(req.query.page) || 1;
            const pageSize = 9;
            const categoryID = '';
            const productCount = await Product.countDocuments({ status: "Active" });
            const totalPages = Math.ceil(productCount / pageSize);
    
            const products = await Product.find({ status: "Active" })
                .skip((page - 1) * pageSize)
                .limit(pageSize);
    
            const campaigns = await Campaign.find();
            const brand = await Brand.find();
            const packageIDs = products.map(product => product.package);
            const packages = await Package.find({ _id: { $in: packageIDs } });
            const packageMap = packages.reduce((acc, pkg) => {
                acc[pkg._id.toString()] = pkg.packageName;
                return acc;
            }, {});
    
            const productsWithDetails = products.map(product => {
                const campaignDetail = campaigns
                    .flatMap(campaign => campaign.campaignDetails)
                    .find(detail => detail.productID === product._id.toString());
    
                const discountPercentage = campaignDetail
                    ? Math.round(
                          ((campaignDetail.currentPrice - campaignDetail.campaignPrice) /
                              campaignDetail.currentPrice) *
                              100
                      )
                    : null;
    
                return {
                    ...product.toObject(),
                    campaignDetail: campaignDetail || null,
                    discountPercentage: discountPercentage,
                    packageName: packageMap[product.package] || "Unknown", 
                };
            });
    
            const categories = await Category.find();
            const business = await Business.find();
            const userID = req.session.userId;
    
            res.locals.req = req;
            res.locals.activePage = "shop";
    
            res.render("shop", {currentPage: page,totalPages,products: productsWithDetails,categories,categoryID,userID,business,brand});
        } catch (err) {
            console.error("Error fetching data:", err);
            return res.redirect("../404");
        }
});
router.get("/shop/:categoryID", async (req, res) => {
        try {
            const page = parseInt(req.query.page) || 1;
            const pageSize = 9;
            const categoryID = req.params.categoryID;
            const productCount = await Product.countDocuments({ category: categoryID, status: "Active" });
            const totalPages = Math.ceil(productCount / pageSize);
            const products = await Product.find({ category: categoryID, status: "Active" }).skip((page - 1) * pageSize).limit(pageSize);
    
            const campaigns = await Campaign.find();
            const packages = await Package.find();
            const productsWithDetails = products.map(product => {
                const campaignDetail = campaigns
                    .flatMap(campaign => campaign.campaignDetails)
                    .find(detail => detail.productID === product._id.toString());
    
                const discountPercentage = campaignDetail
                    ? Math.round(
                          ((campaignDetail.currentPrice - campaignDetail.campaignPrice) /
                              campaignDetail.currentPrice) *
                              100
                      )
                    : null;
    
                const packageDetail = packages.find(pkg => pkg._id.toString() === product.package);
    
                return {
                    ...product.toObject(),
                    campaignDetail: campaignDetail || null,
                    discountPercentage: discountPercentage,
                    packageName: packageDetail ? packageDetail.packageName : "Unknown",
                };
            });
    
            const categories = await Category.find();
            const business = await Business.find();
            const brand = await Brand.find();		
            const userID = req.session.userId;
    
            res.locals.req = req;
            res.locals.activePage = "shop";
    
            res.render("shop", {currentPage: page,totalPages,products: productsWithDetails,categories,categoryID,userID,business,brand});
        } catch (err) {
            console.error("Error fetching data:", err);
            return res.redirect("../404");
        }
});
router.post("/search", async (req, res) => {
        try {
            const query = req.body.search;
            const matchingCategories = await Category.find({categoryName: { $regex: query, $options: "i" }});
            const categoryIDs = matchingCategories.map(category => category._id.toString());
            const products = await Product.find({
                $or: [
                    { productName: { $regex: query, $options: "i" } },
                    { brandName: { $regex: query, $options: "i" } },
                    { description: { $regex: query, $options: "i" } },
                    { category: { $in: categoryIDs } }
                ],
                status: "Active"
            });
            const campaigns = await Campaign.find();
            const packages = await Package.find();
            const productsWithDetails = products.map(product => {
                const campaignDetail = campaigns
                    .flatMap(campaign => campaign.campaignDetails)
                    .find(detail => detail.productID === product._id.toString());
    
                const discountPercentage = campaignDetail
                    ? Math.round(
                          ((campaignDetail.currentPrice - campaignDetail.campaignPrice) /
                              campaignDetail.currentPrice) *
                              100
                      )
                    : null;
    
                const packageDetail = packages.find(pkg => pkg._id.toString() === product.package);
    
                return {
                    ...product.toObject(),
                    campaignDetail: campaignDetail || null,
                    discountPercentage: discountPercentage,
                    packageName: packageDetail ? packageDetail.packageName : "Unknown"
                };
            });
            const categories = await Category.find();
            const business = await Business.find();
            const userID = req.session.userId;
    
            res.locals.req = req;
            res.locals.activePage = "search";
            res.render("search", { query, products: productsWithDetails, categories, userID, business });
        } catch (err) {
            console.error("Error during search:", err);
            res.status(500).send("Internal Server Error");
        }
}); 
router.get("/campaign/:campaignID", async (req, res) => {
        try {
            const categoryID = '';
            const campaignID = req.params.campaignID;
            const page = parseInt(req.query.page) || 1;
            const pageSize = 12;
    
            const campaign = await Campaign.findOne({ _id: campaignID });
            if (!campaign) {
                return res.redirect("../404");
            }
    
            const productIDs = campaign.campaignDetails.map(detail => detail.productID);
            const totalProducts = productIDs.length;
            const totalPages = Math.ceil(totalProducts / pageSize);
            const products = await Product.find({ _id: { $in: productIDs } }).skip((page - 1) * pageSize).limit(pageSize);
            const packages = await Package.find();
            const productsWithDetails = products.map(product => {
                const campaignDetail = campaign.campaignDetails.find(detail => detail.productID === product._id.toString());
                const discountPercentage = campaignDetail
                    ? Math.round(
                          ((campaignDetail.currentPrice - campaignDetail.campaignPrice) /
                              campaignDetail.currentPrice) *
                              100
                      )
                    : null;
                const packageDetail = packages.find(pkg => pkg._id.toString() === product.package);
                return {
                    ...product.toObject(),
                    campaignDetail: campaignDetail || null,
                    discountPercentage: discountPercentage,
                    packageName: packageDetail ? packageDetail.packageName : "Unknown",
                };
            });
    
            const business = await Business.find();
            const userID = req.session.userId;
    
            res.locals.req = req;
            res.locals.activePage = "campaign";
            res.render("campaign", {categoryID,userID,business,campaign,products: productsWithDetails,currentPage: page,totalPages});
        } catch (err) {
            console.error("Error fetching campaign data:", err);
            return res.redirect("../404");
        }
}); 
router.get("/product-detail/:productID", async (req, res) => {
        try {
            const productID = req.params.productID;
            const products = await Product.findOne({ _id: productID });
            if (!products) {
                return res.redirect("../404");
            }
    
            const category = await Category.findOne({ _id: products.category });
            const categoryName = category ? category.categoryName : "Unknown";
            const package = await Package.findOne({ _id: products.package });
            const packageName = package ? package.packageName : "Unknown"; 
            const business = await Business.find();
            const today = new Date().toISOString().split("T")[0];
            const campaigns = await Campaign.find({
                campaignDetails: { $elemMatch: { productID: productID } }
            });
    
            let campaignDetail = null;
            campaigns.forEach(campaign => {
                if (campaign.campaignStartDate <= today && campaign.campaignEndDate >= today) {
                    const matchingDetail = campaign.campaignDetails.find(
                        detail => detail.productID === productID
                    );
                    if (matchingDetail) {
                        campaignDetail = matchingDetail;
                    }
                }
            });
    
            const userID = req.session.userId;
            res.locals.req = req;
            res.locals.activePage = "product-detail";
            res.render("product-detail", {products,userID,business,categoryName,packageName,campaignDetail});
        } catch (err) {
            console.error("Error fetching data:", err);
            return res.redirect("../404");
        }
});
//ORDER
router.get("/cart", async (req, res) => {
        try {
                const userID = req.session.userId;
                const user = await User.findOne({ _id: userID });
                const business = await Business.find();
                res.locals.req = req;
                res.locals.activePage = "cart";
                res.render("cart", {userID,user,business});
        } catch (err) {
                console.error("Error:", err);
                return res.redirect("../404");
        }
});
router.get("/checkout", async (req, res) => {
        try {
                if (!req.session.userId) {
                        return res.redirect("/login");
                }
                const business = await Business.find();
                const reviews = await Reviews.find();
                const services = await Service.find();
                const userID = req.session.userId;
                const user = await User.findOne({ _id: userID });
                res.locals.req = req;
                res.locals.activePage = "checkout";
                res.render("checkout", {business,reviews,services,userID,user});
        } catch (err) {
                console.error("Error:", err);
                return res.redirect("../404");
        }
});
router.post("/place-order", async (req, res) => {
        try {
                const orderNumber = "GST-" + generateOrderNumber();
                const {name,surname,userID,email,gsm,street,no,postcode,ort,note,orderPrice,appliedcouponCode,discount} = req.body;
                let orderItems = req.body.orderItems;
                if (typeof orderItems === 'string') {
                    orderItems = JSON.parse(orderItems);
                }
                const newOrder = new Order({name,surname,userID,email,gsm,street,no,postcode,ort,note,orderNumber,orderItems,orderPrice,couponCode:appliedcouponCode,discount});
                console.log(appliedcouponCode)
                await User.updateOne({ _id: userID },{$set: {name,surname,gsm,street,no,postcode,ort}});
                await newOrder.save();
                res.redirect('/order-result/' + orderNumber);
        } catch (err) {
                console.error(err);
                return res.redirect("../404");
        }
});
router.get("/order-result/:orderNumber", async (req, res, next) => {
    try {
        const orderNumber = req.params.orderNumber;
        const userID = req.session.userId;

        // Sipariş detaylarını al
        const orderdetails = await Order.findOne({ orderNumber: orderNumber });
        if (!orderdetails) {
            return next();
        }

        // Sipariş ürün detaylarını genişlet
        const orderItemsWithDetails = await Promise.all(
            orderdetails.orderItems.map(async (item) => {
                const product = await Product.findById(item._id);
                if (product) {
                    let packageName = "Unknown";
                    if (product.package) {
                        const pkg = await Package.findById(product.package);
                        if (pkg) {
                            packageName = pkg.packageName;
                        }
                    }
                    return {
                        ...item.toObject(),
                        packageName,
                        image: product.productImages[0],
                        category: product.category,
                        description: product.description,
                    };
                }
                return item; // Eğer ürün bulunamazsa, orijinal item'i döndür
            })
        );

        // MwSt. hesaplama
        const mwstSummary = {};
        let totalMwst = 0;

        orderItemsWithDetails.forEach((item) => {
            const { mwstName, mwstValue, mwstRatio } = item;
            if (mwstName) {
                const key = `${mwstName} (%${mwstRatio})`;
                if (!mwstSummary[key]) {
                    mwstSummary[key] = 0;
                }
                mwstSummary[key] += parseFloat(mwstValue);
                totalMwst += parseFloat(mwstValue);
            }
        });

        // Subtotal hesaplama
        const subtotal = parseFloat(orderdetails.orderPrice) - totalMwst;

        // Güncellenmiş orderdetails
        const updatedOrderDetails = {
            ...orderdetails.toObject(),
            orderItems: orderItemsWithDetails,
        };

        const business = await Business.find();

        // Verileri gönder
        res.locals.req = req;
        res.render("order-result", {
            orderdetails: updatedOrderDetails,
            mwstSummary,
            subtotal,
            totalMwst,
            business,
            userID,
        });
    } catch (err) {
        logger.error("Error Log:", err);
        next(err);
    }
});
router.get('/delete-account', async (req, res) => {
        try {
            const userId = req.session.userId;
            delete req.session.userId;
            await User.deleteOne({ _id: userId });
            return res.redirect("/login");
        } catch (error) {
            console.error("Error deleting user:", error);
            return res.redirect("../404");
        }
});
module.exports = router;
