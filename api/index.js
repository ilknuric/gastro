const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const path = require('path');
const ejs = require('ejs');
const axios = require('axios');
const nodemailer = require('nodemailer');
const User = require('../models/userModel');
const Admin = require('../models/adminModel');
const Reviews = require('../models/reviewModel');
const Faq = require('../models/faqModel');
const Agb = require('../models/agbModel');
const Impressum = require('../models/impressumModel');
const Business = require('../models/businessModel');
const Service = require('../models/serviceModel');
const ScheduleModel = require('../models/calendarModel');
const Category = require('../models/categoryModel');
const Product = require('../models/productModel');
const Fav = require('../models/favModel');
const Workers = require('../models/workerModel');
const Campaign = require('../models/campaignModel');
const Mwst = require('../models/mwstModel');
const Coupon = require('../models/promoModel');
const Order = require('../models/orderModel');
const Slide= require('../models/slideModel');
const Holiday= require('../models/holidayModel');
const moment = require("moment")
const transporter = nodemailer.createTransport({
    host: 'mail.eatorder.ch',
    port: 465,
    secure: true,
    auth: {
	  user: 'info@ilknurcengiz.com',
	  pass: 'Aqtg70@22',
    },
    tls: { 
      rejectUnauthorized: false 
    },
  });
function generateTokens(id, email) {
    const accessToken = jwt.sign({ id, email }, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '1d' });
    const refreshToken = jwt.sign({ id, email }, process.env.REFRESH_TOKEN_SECRET, { expiresIn: '30d' });
    return { accessToken, refreshToken };
}
function authenticateToken(req, res, next) {
    const token = req.headers.authorization;
    if (!token) {
        return res.sendStatus(401);
    }
    const tokenParts = token.split(' ');
    if (tokenParts.length !== 2 || tokenParts[0] !== 'Bearer') {
        return res.sendStatus(401);
    }
    const jwtToken = tokenParts[1];
    jwt.verify(jwtToken, process.env.ACCESS_TOKEN_SECRET, (err, user) => {
        if (err) {
            return res.status(403).json(err);
        }
        req.user = user;
        next();
    });
}
function generateTokensAdmin(id, username, businessID) {
    const accessToken = jwt.sign({ id, username, businessID }, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '1d' });
    const refreshToken = jwt.sign({ id, username, businessID }, process.env.REFRESH_TOKEN_SECRET, { expiresIn: '30d' });
    return { accessToken, refreshToken };
}
function authenticateTokenAdmin(req, res, next) {
    const token = req.headers.authorization;
    if (!token) {
        return res.sendStatus(401);
    }
    const tokenParts = token.split(' ');
    if (tokenParts.length !== 2 || tokenParts[0] !== 'Bearer') {
        return res.sendStatus(401);
    }
    const jwtToken = tokenParts[1];
    jwt.verify(jwtToken, process.env.ACCESS_TOKEN_SECRET, (err, admin) => {
        if (err) {
            return res.status(403).json(err);
        }
        req.admin = admin;
        next();
    });
}
function userToken(req, res, next) {
    const token = req.headers.authorization;
    if (token) {
        const tokenParts = token.split(' ');
        if (tokenParts.length === 2 && tokenParts[0] === 'Bearer') {
            const jwtToken = tokenParts[1];
            jwt.verify(jwtToken, process.env.ACCESS_TOKEN_SECRET, (err, user) => {
                if (!err) {
                    req.user = user;
                }
                next();
            });
        } else {
            next();
        }
    } else {
        next();
    }
}
const shuffleArray = (array) => {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
}
function isDateBetween(date, startDate, endDate) {
    return date >= startDate && date <= endDate;
}
const generateOrderNumber = () => {
    const random = Math.floor(Math.random() * 9900000) + 100000;
    return 'BRB-' + random;
};
function formatDate(dateString) {
	const options = {
		weekday: 'long',
		year: 'numeric',
		month: 'long',
		day: 'numeric',
	};
	const formattedDate = new Date(dateString).toLocaleDateString('de-DE', options);
	return formattedDate;
}
function formatHour(hourString) {
	const options = {
		hour: 'numeric',
		minute: 'numeric',
	};
	const formattedHour = new Date(hourString).toLocaleTimeString('de-DE', options);
	return formattedHour;
}
function adjustTime(time, hours) {
    const [hh, mm] = time.split(':');
    const adjustedHours = parseInt(hh, 10) + hours;
    const adjustedHH = Math.max(0, adjustedHours);
    
    return `${adjustedHH.toString().padStart(2, '0')}:${mm}`;
  }
  function isZurichInCEST() {
    const currentDate = new Date();
    const month = currentDate.getMonth(); 
    const day = currentDate.getDate();
    const lastSundayOfMarch = new Date(currentDate.getFullYear(), 2, 31 - ((day % 7) === 0 ? 7 : (day % 7))); 
    const lastSundayOfOctober = new Date(currentDate.getFullYear(), 9, 31 - ((day % 7) === 0 ? 7 : (day % 7)));
  
    return currentDate > lastSundayOfMarch && currentDate < lastSundayOfOctober;
  }
  
//USERS
router.get('/slides', async (req, res) => {
    try {
        const slides = await Slide.find();

        if (slides) {
            res.status(200).json(slides);
        } else {
            res.status(404).json({ error: 'Arbeiter nicht gefunden' });
        }
    } catch (err) {
        console.error('Fehler beim Abrufen der Daten:', err);
        res.status(500).json({ error: 'Fehler beim Abrufen der Daten' });
    }
});
router.post("/signin", async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await User.findOne({ email });
        const authType='User';
        if (!user) {
            return res.status(404).json({ error: "Benutzer nicht gefunden" });
        }
        const isPasswordMatch = await bcrypt.compare(password, user.password);
        if (isPasswordMatch) {
            const { accessToken, refreshToken } = generateTokens(user._id, user.email);
            return res.status(200).json({ accessToken, refreshToken, authType });
        } else {
            return res.status(500).json({ error: "Falsches Passwort" });
        }
    } catch (error) {
        console.error("Error in signin:", error);
        return res.status(500).json({ error: "Ein Fehler ist aufgetreten. Bitte kontaktieren Sie uns." });
    }
});
router.post('/signup', async (req, res) => {
    try {
        const { email, password } = req.body;
        const existingUser = await User.findOne({ email });
        const authType='User';
        if (existingUser) {
            return res.status(400).json({ error: "E-Mail wird bereits verwendet. Bitte wählen Sie eine andere E-Mail." });
        }
        const hashedPassword = await bcrypt.hash(password, 10);
        const newUser = await User.create({ email, password: hashedPassword });
        const { accessToken, refreshToken } = generateTokens(newUser._id, newUser.email);
        return res.status(201).json({ accessToken, refreshToken, authType });
    } catch (error) {
        console.error("Error in signup:", error);
        return res.status(500).json({ error: "Registrierung fehlgeschlagen. Bitte versuche es erneut." });
    }
});
router.post('/refresh', async (req, res) => {
    try {
        const token = req.body.token;
        const authType="User";
        jwt.verify(token, process.env.REFRESH_TOKEN_SECRET, (err, data) => {
            if (err) {
                return res.status(401).json(err);
            }
            const { accessToken, refreshToken } = generateTokens(data.id, data.email);
            return res.status(200).json({ accessToken, refreshToken,authType });
        });
    } catch (err) {
        console.error('Fehler beim Aktualisieren des Tokens:', err);
        res.status(500).json({ error: 'interner Serverfehler' });
    }
});
router.post('/user-update', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        if (!userId) return res.status(401).json({ error: "Autorisierungsfehler" });

        const { name, surname, email, gsm, street, no, postcode, ort, password, passwordConfirmation } = req.body;
        const user = await User.findById(userId);
        if (!user) return res.status(404).json({ error: "Benutzer nicht gefunden" });

        if (name) user.name = name;
        if (surname) user.surname = surname;
        if (gsm) user.gsm = gsm;
        if (email) user.email = email;
        if (street) user.street = street;
        if (no) user.no = no;
        if (postcode) user.postcode = postcode;
        if (ort) user.ort = ort;

        if (password && passwordConfirmation) {
            if (password === passwordConfirmation) {
                const hashedNewPassword = await bcrypt.hash(password, 10);
                user.password = hashedNewPassword;
            }    
        }
        await user.save();
        return res.status(200).json({ message: "Informationen erfolgreich aktualisiert" });
    } catch (error) {
        console.error("Error updating user information:", error);
        return res.status(500).json({ error: "Informationen konnten nicht aktualisiert werden. Bitte versuchen Sie es später noch einmal." });
    }
});
router.post('/password-confirmation', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        if (!userId) return res.status(401).json({ error: "Autorisierungsfehler" });

        const { password, passwordConfirmation } = req.body;
        const user = await User.findById(userId);
        if (!user) return res.status(404).json({ error: "Benutzer nicht gefunden" });

        if (password === passwordConfirmation) {
            const isOldPasswordMatch = await bcrypt.compare(password, user.password);
            if (!isOldPasswordMatch) {
                return res.status(500).json({error: "Das Passwort ist nicht korrekt"});
            } else {
                return res.status(200).json({success: "Passwort korrekt"});
            }
        }
        return res.status(200).json({ message: "Informationen erfolgreich aktualisiert" });
    } catch (error) {
        console.error("Error updating user information:", error);
        return res.status(500).json({ error: "Informationen konnten nicht aktualisiert werden. Bitte versuchen Sie es später noch einmal." });
    }
});
router.get('/user-me', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        if (!userId) return res.status(401).json({ error: "Autorisierungsfehler" });

        const user = await User.findById(userId, 'name surname email gsm street no postcode ort');
        if (!user) return res.status(404).json({ error: "Benutzer nicht gefunden" });

        return res.status(200).json({
            name: user.name,
            surname: user.surname,
            email: user.email,
            gsm: user.gsm,
            street: user.street,
            no: user.no,
            postcode: user.postcode,
            ort: user.ort,
        });
    } catch (error) {
        console.error("Error fetching user information:", error);
        return res.status(500).json({ error: "Informationen konnten nicht abgerufen werden. Bitte versuchen Sie es später noch einmal." });
    }
});
router.get('/user-delete', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        await User.deleteOne({ _id: userId });

        res.status(200).json({ message: "Benutzer erfolgreich gelöscht" });
    } catch (error) {
        console.error("Error deleting user:", error);
        return res.status(500).json({ error: "Benutzer kann nicht gelöscht werden. Bitte versuchen Sie es später noch einmal."});
    }
});
router.get('/favorites', authenticateToken, async (req, res) => {
    try {
        let userID = req.user.id;
        const favorites = await Fav.find({ userID: userID });
        const favoriteBusinessIds = favorites.map(fav => fav.businessID);
        const businessStatus = 'Active';
        const businesses = await Business.find({ _id: { $in: favoriteBusinessIds }, businessStatus:businessStatus });        

        res.status(200).json(businesses);    
     
    } catch (err) {
        console.error(err);
        res.status(500).send('interner Serverfehler');
    }
});
router.get('/appOrders', authenticateToken,  async (req, res) => {
    try {
        let userID = req.user.id;
        const orders = await Order.find({ userID });

        if (orders.length === 0) {
            res.status(404).json({ error: 'Bestellungen nicht gefunden' });
        } 
        res.status(200).json(orders);
    } catch (err) {
        console.error(err);
        res.status(500).send('interner Serverfehler');
    }
});
router.get('/appReservation', authenticateToken, async (req, res) => {
    try {
        const userID = req.user.id;
        const orders = await Order.find({ userID });
        const orderNumbers = orders.map(order => order.orderNumber);
        const reservations = await ScheduleModel.find({ orderNumber: { $in: orderNumbers } });

        if (reservations.length === 0) {
            return res.status(404).json({ error: 'Reservierung nicht gefunden' });
        }
        res.status(200).json(reservations);
    } catch (err) {
        console.error(err);
        res.status(500).send('interner Serverfehler');
    }
});
router.post('/mark-fav', authenticateToken,  async (req, res) => {
    try {
        let {businessID } = req.body;
        let userID = req.user.id;
        const existingFav = await Fav.findOne({ userID, businessID });

        if (!existingFav) {
            const newFav = new Fav({ userID, businessID });
            await newFav.save();
            res.status(200).json();
        } else {
            await Fav.deleteOne({ userID, businessID });
            res.status(200).json();
        }
    } catch (err) {
        console.error(err);
        res.status(500).send('interner Serverfehler');
    }
});
router.post('/mark-as-fav', async (req, res) => {
    try {
        const { userID, businessID } = req.body;
        const existingFav = await Fav.findOne({ userID, businessID }).exec();

        if (!existingFav) {
            const newFav = new Fav({ userID, businessID });
            await newFav.save();
            res.status(200).json({ message: 'Erfolgreich als Favorit markiert' });
        } else {
            res.status(400).json({ message: 'Unternehmen bereits als Favorit markiert' });
        }
    } catch (err) {
        console.error(err);
        res.status(500).send('interner Serverfehler');
    }
});
router.post('/remove-fav', async (req, res) => {
    try {
        const { userID, businessID } = req.body;
        const existingFav = await Fav.findOne({ userID, businessID }).exec();

        if (existingFav) {
            const favID=existingFav._id
            await Fav.findByIdAndRemove(favID);
            res.status(200).json({ message: 'Erfolgreich aus den Favoriten entfernt' });
        } else {
            res.status(404).json({ message: 'Favorit nicht gefunden' });
        }
    } catch (err) {
        console.error(err);
        res.status(500).send('interner Serverfehler');
    }
});
//PAGES
router.get('/impressum', async (req, res) => {
    try {
        const impressum = await Impressum.find();
        res.status(200).json(impressum);
    } catch (err) {
        console.error('Fehler beim Abrufen des Impressums:', err);
        res.status(500).json({ error: 'interner Serverfehler' });
    }
});
router.get('/agb', async (req, res) => {
    try {
        const agb = await Agb.find();
        res.status(200).json(agb);
    } catch (err) {
        console.error('Fehler beim Abrufen der AGB:', err);
        res.status(500).json({ error: 'interner Serverfehler' });
    }
});
router.get('/faq', async (req, res) => {
    try {
        const faq = await Faq.find();
        res.status(200).json(faq);
    } catch (err) {
        console.error('Fehler beim Abrufen der FAQ:', err);
        res.status(500).json({ error: 'interner Serverfehler' });
    }
});
router.get('/reviews', async (req, res) => {
    try {
        const reviews = await Reviews.find();
        res.status(200).json( reviews );
    } catch (err) {
        console.error('Fehler beim Abrufen der Bewertungen:', err);
        res.status(500).json({ error: 'interner Serverfehler' });
    }
});
//CATEGORY
router.get('/category', async (req, res) => {
    try {
        const categories = await Category.find();
        res.status(200).json(categories);
    } catch (err) {
        console.error('Fehler beim Abrufen der Kategorien:', err);
        res.status(500).json({ error: 'interner Serverfehler' });
    }
});
router.get('/category/:categoryID', async (req, res) => {
    try {
        const categoryID = req.params.categoryID;
        const categories = await Category.findOne({_id:categoryID});
        res.status(200).json(categories);
    } catch (err) {
        console.error('Fehler beim Abrufen der Kategorien:', err);
        res.status(500).json({ error: 'interner Serverfehler' });
    }
});
router.get('/mwst/:mwstID', async (req, res) => {
    try {
        const mwstID = req.params.mwstID;
        const mwst = await Mwst.findOne({_id:mwstID});
        res.status(200).json(mwst);
    } catch (err) {
        console.error('Fehler beim Abrufen der Kategorien:', err);
        res.status(500).json({ error: 'interner Serverfehler' });
    }
});
//LISTINGS
router.get('/all-listing', async (req, res) => {
    try {
        const businessStatus = 'Active';
        const business = await Business.find({businessStatus:businessStatus}); 
        const reviews = await Reviews.find();
        const services = await Service.find();
        res.status(200).json({ business, reviews, services });
    } catch (err) {
        console.error('Fehler beim Abrufen der Daten:', err);
        res.status(500).json({ error: 'interner Serverfehler' });
    }
});
router.get('/businesses', async (req, res) => {
    try {
        const businessStatus = 'Active';
        const business = await Business.find({businessStatus:businessStatus}); 
        const reviews = await Reviews.find();
        const services = await Service.find();
        res.status(200).json({ business, reviews, services });
    } catch (err) {
        console.error('Fehler beim Abrufen der Daten:', err);
        res.status(500).json({ error: 'interner Serverfehler' });
    }
});
router.post('/business-map', async (req, res) => {
    try {
        const businessIDs = req.body.businessIDs;
        const businessStatus = 'Active';
        const businesses = await Business.find({ _id: { $in: businessIDs }, businessStatus:businessStatus });
        res.status(200).json({ businesses });
    } catch (err) {
        console.error('Fehler beim Abrufen der Daten:', err);
        res.status(500).json({ error: 'interner Serverfehler' });
    }
}); 
router.get('/popular-saloons', async (req, res) => {
    try {

        const businessStatus = 'Active';
        const aggregatedOrders = await Order.aggregate([
            {
              $group: {
                _id: "$businessID",
                totalOrderPrice: { $sum: { $toDouble: "$orderPrice" } },
              },
            },
            {
              $sort: { totalOrderPrice: -1 },
            },
            {
              $limit: 3,
            },
        ]);
        const businessIds = aggregatedOrders.map(order => order._id);
        const popularBusinesses = await Business.find({ _id: { $in: businessIds }, businessStatus: businessStatus });
        totalPoints=0;
        averagePoint=0;
        sum=0;
        if (popularBusinesses.length === 0) {
            const businessStatus = 'Active';
            const businesses = await Business.find({businessStatus:businessStatus}); 
            shuffleArray(businesses);

            const reviewsMap = new Map();
            const reviews = await Reviews.find({ businessID: { $in: businesses.map((business) => business._id) } });
            reviews.forEach((review) => {
                if (!reviewsMap.has(review.businessID)) {
                    reviewsMap.set(review.businessID, []);
                }
                reviewsMap.get(review.businessID).push(review);
            });

            const popularBusinesses = businesses.slice(0, 3);
            const businessesWithReviews = popularBusinesses.map((business) => {
                const businessID = business._id.toString();
                const businessReviews = reviewsMap.get(businessID) || [];
                const totalPoints = businessReviews.reduce((sum, review) => sum + parseInt(review.reviewPoint), 0);
                const averagePoint = businessReviews.length > 0 ? totalPoints / businessReviews.length : 0;            
                return {
                    ...business.toObject(),
                    averageReviewPoint: averagePoint,
                    reviewCount: businessReviews.length,
                };
            });
            businessesWithReviews.sort((a, b) => b.reviewCount - a.reviewCount);
        }
        
        const reviewsMap = new Map();
        const reviews = await Reviews.find({ businessID: { $in: popularBusinesses.map((business) => business._id) } });
        
        reviews.forEach((review) => {
          if (!reviewsMap.has(review.businessID)) {
            reviewsMap.set(review.businessID, []);
          }
          reviewsMap.get(review.businessID).push(review);
        });

        const businessesWithReviews = popularBusinesses.map((business) => {
          const businessID = business._id.toString();
          const businessReviews = reviewsMap.get(businessID) || [];
          const totalPoints = businessReviews.reduce((sum, review) => sum + parseFloat(review.reviewPoint), 0);
          const averagePoint = businessReviews.length > 0 ? totalPoints / businessReviews.length : 0;
          return {
            ...business.toObject(),
            averageReviewPoint: averagePoint,
            reviewCount: businessReviews.length,
          };
        });
        
        businessesWithReviews.sort((a, b) => b.reviewCount - a.reviewCount);
        res.status(200).json(businessesWithReviews);
    } catch (err) {
        console.error('Fehler beim Abrufen der Daten:', err);
        res.status(500).json({ error: 'Fehler beim Abrufen der Daten', message: err.message });
    }
});
router.get('/listing-detail/:businessID', userToken, async (req, res) => {
    try {
        const businessID = req.params.businessID;
        const userID = req.user?.id;
        const existingFav = await Fav.findOne({ userID, businessID });
        let isFavorite = false;
        if (!userID) {
            isFavorite = false;
        } else {
            
            if (existingFav) {
                isFavorite = true;
            } else {
                isFavorite = false;
            }
        }
        
        const status = 'Active';
        let business = await Business.findOne({ _id: businessID, businessStatus:status });
        const reviews = await Reviews.find({ businessID });
        const services = await Service.find({ businessID, status });
        const products = await Product.find({ businessID, status });
        const campaigns = await Campaign.find({ businessID });
        business = {...business._doc, isFavorite: isFavorite,};
        
        const serviceCategoryIds = [...new Set(services.map(service => service.category))];
        const productCategoryIds = [...new Set(products.map(product => product.category))];
        const uniqueCategoryIds = [...new Set([...serviceCategoryIds, ...productCategoryIds])];
        const categoryDetails = await Category.find({ _id: { $in: uniqueCategoryIds } });
        const categoryMap = {};
        categoryDetails.forEach(category => {
            categoryMap[category._id.toString()] = {
                categoryName: category.categoryName,
                mwstOption: category.mwstOption,
                mwstName: category.mwstName + ' (%'+category.mwstOption+')',
            };
        });
        const productsWithCampaign = products.map(product => {
            const activeCampaign = campaigns.find(campaign =>
                campaign.campaignType === 'Product' &&
                campaign.campaignDetails.some(detail =>
                    detail.productID === product._id.toString() &&
                    isDateBetween(new Date(), new Date(campaign.campaignStartDate), new Date(campaign.campaignEndDate))
                )
            );
            const categoryData = categoryMap[product.category];
            if (activeCampaign) {
                const productCampaignDetail = activeCampaign.campaignDetails.find(detail => detail.productID === product._id.toString());
                if (productCampaignDetail) {
                    return {
                        ...product._doc,
                        inCampaign: true,
                        oldPrice: product.price, 
                        price: productCampaignDetail.campaignPrice,
                        categoryName: categoryData.categoryName,
                        mwstValue: categoryData.mwstOption,
                        mwstName: categoryData.mwstName.includes('(%' + categoryData.mwstOption + ')') ? categoryData.mwstName : categoryData.mwstName + ' (%' + categoryData.mwstOption + ')',

                        mwstPrice: categoryData.mwstOption*productCampaignDetail.campaignPrice/100,
                        
                    };
                }
            }
            return {
                ...product._doc,
                inCampaign: false,
                categoryName: categoryData.categoryName,
                mwstValue: categoryData.mwstOption,
                mwstName: categoryData.mwstName.includes('(%' + categoryData.mwstOption + ')') ? categoryData.mwstName : categoryData.mwstName + ' (%' + categoryData.mwstOption + ')',

                mwstPrice: categoryData.mwstOption*product.price/100,
            };
        });

        const servicesWithCampaign = services.map(service => {
            const activeCampaign = campaigns.find(campaign =>
                campaign.campaignType === 'Service' &&
                campaign.campaignDetails.some(detail =>
                    detail.serviceID === service._id.toString() &&
                    isDateBetween(new Date(), new Date(campaign.campaignStartDate), new Date(campaign.campaignEndDate))
                )
            );
            const categoryData = categoryMap[service.category];
            if (activeCampaign) {
                const serviceCampaignDetail = activeCampaign.campaignDetails.find(detail => detail.serviceID === service._id.toString());
                if (serviceCampaignDetail) {
                    return {
                        ...service._doc,
                        inCampaign: true,
                        oldPrice: service.price,
                        price: serviceCampaignDetail.campaignPrice,
                        categoryName: categoryData.categoryName,
                        mwstValue: categoryData.mwstOption,
                        mwstName: categoryData.mwstName.includes('(%' + categoryData.mwstOption + ')') ? categoryData.mwstName : categoryData.mwstName + ' (%' + categoryData.mwstOption + ')',

                        mwstPrice: categoryData.mwstOption*serviceCampaignDetail.campaignPrice/100,
                    };
                }
            }
            return {
                ...service._doc,
                inCampaign: false,
                categoryName: categoryData.categoryName,
                mwstValue: categoryData.mwstOption,
                mwstName: categoryData.mwstName.includes('(%' + categoryData.mwstOption + ')') ? categoryData.mwstName : categoryData.mwstName + ' (%' + categoryData.mwstOption + ')',
                mwstPrice: categoryData.mwstOption*service.price/100,
            };
        });
        if (business) {
            res.status(200).json({ business, reviews, services: servicesWithCampaign, categories: categoryMap, products: productsWithCampaign });
        } else {
            res.status(404).json({ error: 'Unternehmen nicht gefunden' });
        }
    } catch (err) {
        console.error('Fehler beim Abrufen der Daten:', err);
        res.status(500).json({ error: 'Fehler beim Abrufen der Daten' });
    }
});
router.get('/service/:serviceID', async (req, res) => {
    try {
        const serviceID = req.params.serviceID;
        const service = await Service.findOne({ _id: serviceID });

        if (service) {
            res.status(200).json(service);
        } else {
            res.status(404).json({ error: 'Service not found' });
        }
    } catch (err) {
        console.error('Fehler beim Abrufen der Daten:', err);
        res.status(500).json({ error: 'Fehler beim Abrufen der Daten' });
    }
});
router.get('/services/:businessID', async (req, res) => {
    try {
        const businessID = req.params.businessID;
        const service = await Service.findOne({ businessID: businessID });

        if (service) {
            res.status(200).json(service);
        } else {
            res.status(404).json({ error: 'Service nicht gefunden' });
        }
    } catch (err) {
        console.error('Fehler beim Abrufen der Daten:', err);
        res.status(500).json({ error: 'Fehler beim Abrufen der Daten' });
    }
});
router.get('/product/:productID', async (req, res) => {
    try {
        const productID = req.params.productID;
        const status = 'Active';
        const product = await Product.findOne({ _id: productID, status:status });

        if (product) {
            res.status(200).json(product);
        } else {
            res.status(404).json({ error: 'Service nicht gefunden' });
        }
    } catch (err) {
        console.error('Fehler beim Abrufen der Daten:', err);
        res.status(500).json({ error: 'Fehler beim Abrufen der Daten' });
    }
});
router.get('/reviews/:businessID', async (req, res) => {
    try {
        const businessID = req.params.businessID;
        const reviews = await Reviews.findOne({ businessID: businessID });

        if (reviews) {
            res.status(200).json(reviews);
        } else {
            res.status(404).json({ error: 'Bewertungen nicht gefunden' });
        }
    } catch (err) {
        console.error('Fehler beim Abrufen der Daten:', err);
        res.status(500).json({ error: 'Fehler beim Abrufen der Daten' });
    }
});
router.get('/business/:businessID', async (req, res) => {
    try {
        const businessID = req.params.businessID;
        const business = await Business.findOne({ _id: businessID });

        if (business) {
            res.status(200).json(business);
        } else {
            res.status(404).json({ error: 'Unternehmen nicht gefunden' });
        }
    } catch (err) {
        console.error('Fehler beim Abrufen der Daten:', err);
        res.status(500).json({ error: 'Fehler beim Abrufen der Daten' });
    }
});
router.get('/promotion/:couponCode', async (req, res) => {
    try {
        const couponCode = req.params.couponCode;
        const couponStatus = 'Active';
        const coupon = await Coupon.findOne({ couponCode: couponCode, couponStatus:couponStatus  });

        if (coupon) {
            res.status(200).json(coupon);
        } else {
            res.status(404).json({ error: 'Gutschein nicht gefunden' });
        }
    } catch (err) {
        console.error('Fehler beim Abrufen der Daten:', err);
        res.status(500).json({ error: 'Fehler beim Abrufen der Daten' });
    }
});
router.get('/promotionOrder/:couponCode/:userID', async (req, res) => {
    try {
        const couponCode = req.params.couponCode;
        const userID = req.params.userID;

        const couponOrder = await Order.findOne({ couponCode: couponCode, userID:userID  });

        if (couponOrder) {
            res.status(200).json(couponOrder);
        } else {
            res.status(404).json({ error: 'Gutschein nicht gefunden' });
        }
    } catch (err) {
        console.error('Fehler beim Abrufen der Daten:', err);
        res.status(500).json({ error: 'Fehler beim Abrufen der Daten' });
    }
});
router.get('/promotionOrderApp/:couponCode/:businessID', authenticateToken, async (req, res) => {
    try {
        const couponCode = req.params.couponCode;
        const businessID = req.params.businessID;
        const couponStatus = 'Active';
        const userID = req.user.id;

        const couponOrder = await Order.findOne({ couponCode: couponCode, userID: userID });
        const coupon = await Coupon.findOne({ couponCode: couponCode, couponStatus: couponStatus, businessID: businessID });

        if (coupon) {
            if (!couponOrder) {
                let couponValue;
                let couponMinValue= coupon.minValue;
                if (coupon.couponType == '%') {
                    couponValue = { type: "%", value: coupon.couponValue};
                } else {
                    couponValue = { type: "CHF", value: coupon.couponValue};
                }
                res.status(200).json({ couponValue, couponMinValue  });
            } else {
                res.status(404).json({ error: 'Dieser Gutschein wird verwendet' });
            }
        } else {
            res.status(404).json({ error: 'Gutschein nicht gefunden' });
        }
    } catch (err) {
        console.error('Fehler beim Abrufen der Daten:', err);
        res.status(500).json({ error: 'Fehler beim Abrufen der Daten' });
    }
});
router.get('/calendar/:businessID', async (req, res) => {
    try {
        const businessID = req.params.businessID;
        const calendarData = await ScheduleModel.find({ businessID });

        res.status(200).json(calendarData);
    } catch (err) {
        console.error('Fehler bei der Datenextraktion:', err);
        res.status(500).json({ error: 'Fehler bei der Datenextraktion' });
    }
});
router.get('/calendar-data/:calendarID', async (req, res) => {
    try {
        const calendarID = req.params.calendarID;
        const calendarInfo = await ScheduleModel.find({ _id: calendarID });
        const businessID = calendarInfo[0].businessID;
        const workers = await Workers.find({ businessID: businessID });

        let orderNumb;
        if (calendarInfo[0].orderNumber !== undefined && calendarInfo[0].orderNumber !== '0') {
            orderNumb = calendarInfo[0].orderNumber;
        } else {
            orderNumb = null; 
        }

        if (orderNumb) {
            const orders = await Order.find({ orderNumber: orderNumb });
            const orderDetails = orders[0].orderItems;
            const serviceNames = orderDetails.map(item => item.serviceName);
            const concatenatedServiceNames = serviceNames.join(', ');
            const productNames = orderDetails.map(item => item.productName);
            const concatenatedProductNames = productNames.join(', ');

            res.status(200).json({
                calendarInfo,
                workers,
                concatenatedServiceNames,
                concatenatedProductNames,
            });
        } else {
            res.status(200).json({
                calendarInfo,
                workers,
                concatenatedServiceNames: '',
                concatenatedProductNames: '',
            });
        }

    } catch (err) {
        console.error('Fehler bei der Datenextraktion:', err);
        res.status(500).json({ error: 'Fehler bei der Datenextraktion' });
    }
});
router.get('/get-calendar-with-worker/:businessID/:workerID', async (req, res) => {
    try {
        const businessID = req.params.businessID;
        const workerID = req.params.workerID;
        const [calendarData, worker] = await Promise.all([
            ScheduleModel.find({ businessID: businessID, workerID:workerID }),
            Workers.findById(workerID)
        ]);

        const calendarEvents = calendarData.map(event => {
            const startDate = new Date(event.startDate);
            const endDate = new Date(event.endDate);
            startDate.setHours(startDate.getHours());
            endDate.setHours(endDate.getHours());
			const customerName=event.customerName + ' ' +event.customerSurname;
            return {
                id: event._id,
                title: event.title,
                start: startDate,
                end: endDate,
                businessID: event.businessID,
                workerID: event.workerID,
				customerName: customerName,		
                workerColor: worker.workerColor || "#c10137",
                workerName: worker ? worker.name + ' ' +worker.surname : '',
            };
        });
        res.status(200).json(calendarEvents);
    } catch (err) {
        res.status(500).json({ error: err.message });
    } 
});
router.get('/get-calendar/:businessID', async (req, res) => {
    try {
        const businessID = req.params.businessID;
        const paymentStatus="Success";
        const calendarData = await ScheduleModel.find({ businessID: businessID,paymentStatus:paymentStatus });
        const workerIds = calendarData.map(schedule => schedule.workerID);
        const workers = await Workers.find({ _id: { $in: workerIds } });

		const calendarEventss = calendarData.map(async (event) => {
			const worker = await Workers.findOne({ _id: event.workerID });
			const startDate = new Date(event.startDate);
			const endDate = new Date(event.endDate);
			startDate.setHours(startDate.getHours());
			endDate.setHours(endDate.getHours());
			const customerName=event.customerName +' ' +event.customerSurname;
			return {
				id: event._id,
				title: event.title,
				start: startDate,
				end: endDate,
				businessID: event.businessID,
				customerName: customerName,						
				workerName: worker ? worker.name : "Deleted",
				workerColor: worker ? worker.workerColor || "#c10137" : "#c10137",
				workerID: worker ? worker._id : null,
			};
		});

		const calendarEvents = await Promise.all(calendarEventss);
        res.status(200).json(calendarEvents);
    } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal Server Error' });
	}
});
router.get('/get-calendar-data/:businessID', async (req, res) => {
    try {
        const businessID = req.params.businessID;
        const paymentStatus="Success";
        const calendarData = await ScheduleModel.find({ businessID: businessID, paymentStatus:paymentStatus});
        const calendarEvents = calendarData.map(event => {
            const startDate = new Date(event.startDate);
            const endDate = new Date(event.endDate);
            startDate.setHours(startDate.getHours());
            endDate.setHours(endDate.getHours());
            return {
                id: event._id,
                title: event.title,
                start: startDate,
                end: endDate,
                businessID: event.businessID,
            };
        });
        res.status(200).json(calendarEvents);
    } catch (err) {
        res.status(500).json({ error: err.message });
    } 
});
router.get('/get-calendar-data-worker-web/:businessID/:workerID/:dayID/:currentDate/:durationMinutes', async (req, res) => {
    try {
    const businessID = req.params.businessID;
    const workerID = req.params.workerID;
    const dayID = req.params.dayID;
    let currentDate = req.params.currentDate;
    const durationMinutes = parseInt(req.params.durationMinutes, 10); 
    const durationPeriod = (durationMinutes / 15) - 1
    const paymentStatus="Success";
    let dateObject = new Date(currentDate);
    dateObject.setUTCHours(0, 0, 0, 0);
    let endDateObject = new Date(dateObject);
    endDateObject.setUTCHours(23, 59, 59, 999);

    let formattedStartDate = dateObject.toISOString();
    let formattedEndDate = endDateObject.toISOString();
    const calendarData = await ScheduleModel.find({
        businessID: businessID,
        workerID: workerID,
        paymentStatus:paymentStatus,
        startDate: { $gte: formattedStartDate },
        endDate: { $lt: formattedEndDate }
    });
    //GET WORKER
    const availability = 'Available';
    const worker = await Workers.findOne({ businessID: businessID, _id: workerID, availability: availability });
    const holidays = await Holiday.find({ workerID: workerID});
    let workHoursStart = adjustTime(worker.hours[dayID][0].start,1) 
    let workHoursEnd =  adjustTime(worker.hours[dayID][0].end,1)  

    function splitTimeSlots(start, end, period) {
        const appointmentTimes = [];
        const currentTime = moment(start, "HH:mm");
        const endTime = moment(end, "HH:mm");
        for (let i = 0; i < period; i++) {
            let x = moment(start, "HH:mm");
            x.subtract(15 * (i + 1), 'minutes');
            x = x.format("HH:mm");
            appointmentTimes.push(x);
        }
        while (currentTime < endTime) {
            appointmentTimes.push(currentTime.format("HH:mm"));
            currentTime.add(15, 'minutes');
        }
        return appointmentTimes;
    }
   
    let busyHours = []
    for(const element of calendarData){
        const isZurichCEST = isZurichInCEST();
        let beginDate = new Date(element.startDate);
        let finishDate = new Date(element.endDate);
        if (isZurichCEST) {
            beginDate.setHours(beginDate.getHours() + 2);
            finishDate.setHours(finishDate.getHours() + 2);
        } else {
            beginDate.setHours(beginDate.getHours() + 2);
            finishDate.setHours(finishDate.getHours() + 2);
        }
        let startDate = beginDate.toISOString().split("T")[1].split(".")[0].split(":")
        let endDate =  finishDate.toISOString().split("T")[1].split(".")[0].split(":")
        startDate = `${startDate[0]}:${startDate[1]}`
        endDate = `${endDate[0]}:${endDate[1]}`
        let arr = splitTimeSlots(startDate,endDate,durationPeriod)
        busyHours.push(...arr)
    }
    
    let slots = splitTimeSlots(workHoursStart, workHoursEnd,0)
    slots.splice(-durationPeriod);
    slots = slots.filter(time => !busyHours.includes(time));
    console.log(slots)

    //GÜN BUGÜNMÜ?
    var currentD = new Date();
    var hours = currentD.getHours();
    var minutes = currentD.getMinutes();
    var remainingMinutes = 15 - (minutes % 15);
    var adjustedHours = (hours + Math.floor((minutes + remainingMinutes) / 60)) % 24;
    var adjustedMinutes = (minutes + remainingMinutes) % 60;
    var adjustedHoursString = adjustedHours.toString().padStart(2, '0');
    var adjustedMinutesString = adjustedMinutes.toString().padStart(2, '0');
    var currentTime = adjustedHoursString + ":" + adjustedMinutesString;
    const currentISOString = currentD.toISOString();
    const currentt = currentISOString.split('T');        
    const selectedDate = currentDate.split('T');

    if(currentt[0] == selectedDate[0]) {
        const targetIndex = slots.indexOf(currentTime); 
        if(targetIndex !== -1) {
            slots = slots.slice(targetIndex);
        }
    }
    
    
    //HOLIDAY
    const formattedStartDateObject = new Date(formattedStartDate);
    let hol;
    for (const holiday of holidays) {
        const holidayStartDate = new Date(holiday.HolidayStartDate);
        const holidayEndDate = new Date(holiday.HolidayEndDate);

        if (formattedStartDateObject >= holidayStartDate && formattedStartDateObject <= holidayEndDate) {
            hol="Holiday";
            break;
        }
    }
        res.status(200).json({calendarData,timeSlots:slots, hol });
    } catch (err) {
        console.log(err)
        res.status(500).json({ error: err.message });
    }
});

router.get('/get-calendar-data-worker/:businessID/:workerID/:startDate', async (req, res) => {
    try {
        const businessID = req.params.businessID;
        const workerID = req.params.workerID;
        const startDateString = req.params.startDate;
        const startD = new Date(startDateString);
        const endD = new Date(startD);
        endD.setHours(23, 59, 59, 999);
        const paymentStatus="Success";
        const calendarData = await ScheduleModel.find({
            businessID: businessID,
            workerID: workerID,
            paymentStatus:paymentStatus,
            startDate: {
                $gte: startD,
                $lte: endD
            }
        });
        const availability = 'Available';
        const worker = await Workers.findOne({ businessID: businessID, _id: workerID, availability:availability });
        const holidays = await Holiday.find({ workerID: workerID });
        const calendarEvents = calendarData.map(event => {
            const startDate = new Date(event.startDate);
            const endDate = new Date(event.endDate);
            startDate.setHours(startDate.getHours()+1);
            endDate.setHours(endDate.getHours()+1);
            return {
                id: event._id,
                title: event.title,
                start: startDate,
                end: endDate,
                businessID: event.businessID,
                workerID: event.workerID,
            };
        });
        const weekHours = {};
        for (let dayOfWeek = 0; dayOfWeek <= 6; dayOfWeek++) {
            weekHours[dayOfWeek] = worker.hours[dayOfWeek] || [];
            if (weekHours[dayOfWeek].length > 0) {
                weekHours[dayOfWeek].forEach(hour => {                    
                    if (hour.start && hour.end) {
                        hour.start = incrementHour(hour.start);
                        hour.end = incrementHour(hour.end);
                        //hour.start = hour.start;
                        //hour.end = hour.end;
                    }
                });
            }
        }
        function incrementHour(timeString) {
            const [hours, minutes] = timeString.split(':').map(Number);
            const incrementedHours = (hours + 1) % 24;
            return `${String(incrementedHours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
        }
        res.status(200).json({ events: calendarEvents, hours: weekHours, startD, holidays });
    } catch (err) {
        res.status(500).json({ error: err.message });
    } 
});
router.post('/place-order', authenticateToken, async (req, res) => {
  try {
    
    const orderNumber = generateOrderNumber();
    const userID = req.user.id;
    const { name, surname, email, gsm, street, no, postcode, ort, note, businessID, orderItems, startDate, endDate, couponCode, workerID } = req.body;
    let orderPrice = req.body.orderPrice; 
    //WORKER CHECK
    if (workerID && workerID.length>0) {
        const availability ='Available';
        const worker = await Workers.findOne({ _id: workerID, availability:availability, businessID });
        if (!worker) {
            return res.status(400).json({ error: "Der Arbeiter ist nicht mehr verfügbar", delete: true });
        }
    }
    //BUSINESS ID
    if (businessID && businessID.length > 0) {
        const businessStatus='Active';
        const business = await Business.findOne({ _id: businessID,businessStatus:businessStatus });
        if (!business) {
            return res.status(400).json({ error: "Das Geschäft ist nicht mehr verfügbar", delete: true });
        }
    } 
    //SERVICE && PRODUCT CHECK
    const getProductOrServiceDetails = async (orderItem) => {
        try {
            if (orderItem.type === 'Service') {
                const serviceID = orderItem._id;
                const status = 'Active';
                const service = await Service.findOne({ _id: serviceID, status: status, businessID: businessID });
        
                if (!service) {
                    return res.status(400).json({ error: "Der Dienst ist nicht mehr verfügbar", delete: true });
                }
        
                const campaigns = await Campaign.find({ businessID: businessID });
                const campaignService = campaigns.find(campaign => {
                    const today = new Date();
                    const campaignStartDate = new Date(campaign.campaignStartDate);
                    const campaignEndDate = new Date(campaign.campaignEndDate);
        
                    return (
                        today >= campaignStartDate && today <= campaignEndDate &&
                        campaign.campaignDetails.some(detail => detail.serviceID === serviceID)
                    );
                });
                if (campaignService) {
                    const campaignDetail = campaignService.campaignDetails.find(detail => detail.serviceID === serviceID);
                    return campaignDetail.campaignPrice * orderItem.quantity;
                } else {
                    return service.price * orderItem.quantity;
                }
            } else if (orderItem.type === 'Product') {
                const productID = orderItem._id;
                const status = 'Active';
                const product = await Product.findOne({ _id: productID, status: status });
        
                if (!product) {
                    return res.status(400).json({ error: "Das Produkt ist nicht mehr verfügbar", delete: true });
                }
        
                const campaigns = await Campaign.find({ businessID: businessID });
                const campaignProduct = campaigns.find(campaign => {
                    const today = new Date();
                    const campaignStartDate = new Date(campaign.campaignStartDate);
                    const campaignEndDate = new Date(campaign.campaignEndDate);
        
                    return (
                        today >= campaignStartDate && today <= campaignEndDate &&
                        campaign.campaignDetails.some(detail => detail.productID === productID)
                    );
                });
                if (campaignProduct) {
                    const campaignDetail = campaignProduct.campaignDetails.find(detail => detail.productID === productID);
                    return campaignDetail.campaignPrice * orderItem.quantity;
                } else {
                    return product.price * orderItem.quantity;
                }
            }
        } catch (error) {
            console.error('Fehler bei der Verarbeitung der Bestellposition:', error);
            throw error;
        }               
    };
    const prices = await Promise.all(orderItems.map(getProductOrServiceDetails));
    const calculatedOrderPrice = prices.reduce((sum, price) => sum + price, 0);
    const acceptableErrorPercentage = 10;
    const minAcceptableOrderPrice = calculatedOrderPrice * (1 - acceptableErrorPercentage / 100);
    const maxAcceptableOrderPrice = calculatedOrderPrice * (1 + acceptableErrorPercentage / 100);
    if (orderPrice < minAcceptableOrderPrice || orderPrice > maxAcceptableOrderPrice) {
        return res.status(400).json({ error: "Ungültige Bestellung. Preiswert oder Produkte im Warenkorb haben sich geändert", delete: true });
    }
    let orderDiscountPrice;
    let discount;
    if (couponCode && couponCode.length > 0) {
        const couponStatus = 'Active';
        const couponOrder = await Order.findOne({ couponCode: couponCode, userID: userID });
        const coupon = await Coupon.findOne({ couponCode: couponCode, couponStatus: couponStatus, businessID: businessID });
        
        if (!coupon || couponOrder) {
            return res.status(400).json({ error: "Der Gutscheincode ist ungültig oder nicht aktiv", delete: true });
        }
        
        const minValue = coupon.minValue;
        const couponValue = coupon.couponValue;
        const couponType = coupon.couponType;
        
        if (minValue > orderPrice) {
            if (couponType === '%') {
                discount = (couponValue * orderPrice) / 100;
                orderDiscountPrice = orderPrice - discount;
            } else {
                orderDiscountPrice = orderPrice - couponValue;
            }
        } 
       
    }
    if(orderDiscountPrice>0){
        orderPrice=orderDiscountPrice;
    }

    const aggregatedOrderItems = orderItems.reduce((result, item) => {
        const existingItem = result.find((r) => r._id === item._id);
    
        if (existingItem) {
            existingItem.quantity += item.quantity;
        } else {
            result.push({ ...item, quantity: item.quantity });
        }
    
        return result;
    }, []);
    
    const detailedOrderItems = await Promise.all(aggregatedOrderItems.map(async (item) => {
        const itemID = item._id;
        if (item.type === 'Service') {
            const service = await Service.findOne({ _id: itemID });
            const category = await Category.findOne({ _id: service.category });
            const mwst = await Mwst.findOne({ _id: category.mwstID });
            const campaigns = await Campaign.find({ businessID: businessID });
                const campaignService = campaigns.find(campaign => {
                    const today = new Date();
                    const campaignStartDate = new Date(campaign.campaignStartDate);
                    const campaignEndDate = new Date(campaign.campaignEndDate);
        
                    return (
                        today >= campaignStartDate && today <= campaignEndDate &&
                        campaign.campaignDetails.some(detail => detail.serviceID === itemID)
                    );
                });
                if (campaignService) {
                    const campaignDetail = campaignService.campaignDetails.find(detail => detail.serviceID === itemID);
                    const servicePrice= campaignDetail.campaignPrice * item.quantity;
                    const mwstValue= servicePrice * mwst.mwstRatio/100;
                    const mwstName= mwst.mwstName;
                    const mwstRatio= mwst.mwstRatio;
                    if (service) {
                        return {
                            _id: service._id,
                            serviceName: service.serviceName,
                            description: service.description,
                            price: servicePrice,
                            durationMinutes: service.durationMinutes,
                            status: service.status,
                            category: service.category,
                            quantity: item.quantity,
                            mwstValue: mwstValue,
                            mwstName: mwstName,
                            mwstRatio: mwstRatio,
                            businessID: service.businessID,
                        };
                    }
                } else {
                    const servicePrice= service.price * item.quantity;
                    const mwstValue= servicePrice * mwst.mwstRatio/100;
                    const mwstName= mwst.mwstName;
                    const mwstRatio= mwst.mwstRatio;
                    if (service) {
                        return {
                            _id: service._id,
                            serviceName: service.serviceName,
                            description: service.description,
                            price: servicePrice,
                            durationMinutes: service.durationMinutes,
                            status: service.status,
                            category: service.category,
                            mwstValue: mwstValue,
                            mwstName: mwstName,
                            mwstRatio: mwstRatio,
                            quantity: item.quantity,
                            businessID: service.businessID,
                        };
                    }
                }
           
        } else if (item.type === 'Product') {
            const product = await Product.findOne({ _id: itemID });
            const category = await Category.findOne({ _id: product.category });
            const mwst = await Mwst.findOne({ _id: category.mwstID });
            const campaigns = await Campaign.find({ businessID: businessID });
                const campaignProduct = campaigns.find(campaign => {
                    const today = new Date();
                    const campaignStartDate = new Date(campaign.campaignStartDate);
                    const campaignEndDate = new Date(campaign.campaignEndDate);
        
                    return (
                        today >= campaignStartDate && today <= campaignEndDate &&
                        campaign.campaignDetails.some(detail => detail.productID === itemID)
                    );
                });
                if (campaignProduct) {
                    const campaignDetail = campaignProduct.campaignDetails.find(detail => detail.productID === itemID);
                    const productPrice= campaignDetail.campaignPrice * item.quantity;
                    const mwstValue= productPrice * mwst.mwstRatio/100;
                    const mwstName= mwst.mwstName;
                    const mwstRatio= mwst.mwstRatio;
                    if (product) {
                        return {
                            _id: product._id,
                            productName: product.productName,
                            description: product.description,
                            price: productPrice,
                            status: product.status,
                            category: product.category,
                            quantity: item.quantity,
                            mwstValue: mwstValue,
                            mwstName: mwstName,
                            mwstRatio: mwstRatio,
                            businessID: product.businessID,
                        };
                    }
                } else {
                    const productPrice= item.price * item.quantity;
                    const mwstValue= productPrice * mwst.mwstRatio/100;
                    const mwstName= mwst.mwstName;
                    const mwstRatio= mwst.mwstRatio;
                    if (product) {
                        return {
                            _id: product._id,
                            productName: product.productName,
                            description: product.description,
                            price: productPrice,
                            status: product.status,
                            category: product.category,
                            quantity: item.quantity,
                            mwstValue: mwstValue,
                            mwstName: mwstName,
                            mwstRatio: mwstRatio,
                            businessID: product.businessID,
                        };
                    }
                }
        }
        return null;
    }));
    const detailedOrderItemsFiltered = detailedOrderItems.filter(item => item !== null);    
    const mwstSum = detailedOrderItems.reduce((sum, item) => sum + item.mwstValue, 0);
    const subtotal = orderPrice - mwstSum;
    const paymentStatus='Waiting';
    const newOrder = new Order({ name, surname, email, gsm, street, nr: no, postcode, ort, note, userID, businessID, orderNumber,couponCode, discount, orderPrice,subtotal,orderItems: detailedOrderItemsFiltered,paymentStatus });
    const newSchedule = new ScheduleModel({ businessID, orderNumber, workerID, startDate, endDate,paymentStatus,orderNote:note, customerName:name,customerSurname:surname, clientTel:gsm });

    await newOrder.save();
    await newSchedule.save();
    await User.updateOne({ _id: userID }, { $set: { name, surname, gsm, street, no, postcode, ort } });

    const orderGet = await Order.findOne({ orderNumber: orderNumber });
                
    const paymentData = {                    
        amount: orderPrice,
        orderId:orderGet._id,
    };
    const paymentResponse = await axios.post(
            'https://payment.metime-schweiz.ch/payrexxAPI/examples/GatewayCreate.php',
            paymentData,
            {
                headers: {
                    'Content-Type': 'application/json',
                },
            }
        );
    
    if (paymentResponse.data) {
        const link=paymentResponse.data;
        res.status(200).json({ link: link});
    } else {
        res.status(400).json({ error:"No link found"});
    }

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'interner Serverfehler' });
  }
});
router.get('/payrexx-web/:status/:orderID', async (req, res) => {
    try {
        let orderID = req.params.orderID;
		let status = req.params.status;
		let order = await Order.findOne({ _id: orderID });
		
			if (order) {
				if(status==='success'){
					const paymentStatus = 'Success';
					await Order.updateOne({ _id: orderID }, { $set: { paymentStatus } });
					await ScheduleModel.updateOne({ orderNumber: order.orderNumber }, { $set: { paymentStatus } });
					const calendar = await ScheduleModel.findOne({ orderNumber: order.orderNumber });

					const startDateFormatted = formatDate(calendar.startDate);
					
                    const startDate = calendar.startDate; 
                    const zurichTimezoneId = 'Europe/Zurich'; 
                    const localTime = startDate.toLocaleTimeString('de-DE', { timeZone: zurichTimezoneId });
                    const time = localTime.split(':');
                    const startHourFormatted = time[0] + ':' + time[1];
					const businessID=order.businessID;
					const business = await Business.findOne({ _id: businessID });
					const businessName=business.businessName;
					const businessLocation=business.businessLocation;	
					const ownermail=business.businessMail;
					const orderNumber=order.orderNumber;
					const name=order.name;
					const surname=order.surname;
					const useremail=order.email;
					const orderPrice=order.orderPrice;
					const subtotal=order.subtotal;
					const gsm = order.gsm;
					const street=order.street;
					const postcode= order.postcode;
					const ort= order.ort;
					const note= order.note;
					const no=order.no;
					const detailedOrderItemsFiltered=order.orderItems;
					const discount=order.discount;
		
					if(useremail){
						const templatePath = path.join(__dirname, '../routes/mail/orderConfirmation.ejs');
						const renderedHtml = await ejs.renderFile(templatePath,{businessLocation, businessName, name, surname, 	orderPrice,subtotal,orderNumber,useremail,gsm,street,postcode,ort,note,nr:no,detailedOrderItemsFiltered,startDateFormatted,startHourFormatted,discount});
						const templatePathOwner = path.join(__dirname, '../routes/mail/orderConfirmationOwner.ejs');
						const renderedHtmlOwner = await ejs.renderFile(templatePathOwner,{businessLocation, businessName, name, surname,orderPrice,subtotal,orderNumber,useremail,gsm,street,postcode,ort,note,nr:no,detailedOrderItemsFiltered,startDateFormatted,startHourFormatted,discount});
						const customerMailOptions = {
						from: 'metime@metime-schweiz.ch',
						to: useremail,
						subject: 'Bestellbestätigung Gastro Koçak Handel',
						html: renderedHtml,
						};
						await transporter.sendMail(customerMailOptions, (error, info) => {});
						
						const ownerMailOptions = {
						from: "metime@metime-schweiz.ch",
						to: ownermail,
						subject: 'Bestellbestätigung Gastro Koçak Handel',
						html: renderedHtmlOwner,
						};
						await transporter.sendMail(ownerMailOptions, (error, info) => {});
						res.redirect('/order-result/' + orderNumber);

					} else {
						res.status(404).json({ message: "Mail not found" });					
					}	
		
				} else if(status==='failed'){
					const paymentStatus = 'Failed';
					await Order.updateOne({ _id: orderID }, { $set: { paymentStatus } });
					await ScheduleModel.updateOne({ orderNumber: order.orderNumber }, { $set: { paymentStatus } });
					res.status(200).send('Order failed');
				} else if(status==='cancel'){
					const paymentStatus = 'Canceled';
					await Order.updateOne({ _id: orderID }, { $set: { paymentStatus } });
					await ScheduleModel.updateOne({ orderNumber: order.orderNumber }, { $set: { paymentStatus } });
					res.status(200).send('Order canceled');
				}	
			} else {
				//res.status(404).send('Order not found');
				return res.redirect("../../../404");
			}

    } catch (error) {
		return res.redirect("../../../404");
    }
});
router.get('/payrexx/:status/:orderID', async (req, res) => {
    try {
        let orderID = req.params.orderID;
		let status = req.params.status;
		let order = await Order.findOne({ _id: orderID });
		
			if (order) {
				if(status==='success'){
					const paymentStatus = 'Success';
					await Order.updateOne({ _id: orderID }, { $set: { paymentStatus } });
					await ScheduleModel.updateOne({ orderNumber: order.orderNumber }, { $set: { paymentStatus } });
					const calendar = await ScheduleModel.findOne({ orderNumber: order.orderNumber });

					const startDateFormatted = formatDate(calendar.startDate);
					const startHourFormatted = formatHour(calendar.startDate);
					const businessID=order.businessID;
					const business = await Business.findOne({ _id: businessID });
					const businessName=business.businessName;
					const businessLocation=business.businessLocation;					
					const ownermail=business.businessMail;
					const orderNumber=order.orderNumber;
					const name=order.name;
					const surname=order.surname;
					const useremail=order.email;
					const orderPrice=order.orderPrice;
					const subtotal=order.subtotal;
					const gsm = order.gsm;
					const street=order.street;
					const postcode= order.postcode;
					const ort= order.ort;
					const note= order.note;
					const nr=order.nr;
					const detailedOrderItemsFiltered=order.orderItems;
					const discount=order.discount;
		
					if(useremail){
						const templatePath = path.join(__dirname, '../routes/mail/orderConfirmation.ejs');
						const renderedHtml = await ejs.renderFile(templatePath,{businessLocation, businessName, name, surname, 	orderPrice,subtotal,orderNumber,useremail,gsm,street,postcode,ort,note,nr,detailedOrderItemsFiltered,startDateFormatted,startHourFormatted,discount});
						const templatePathOwner = path.join(__dirname, '../routes/mail/orderConfirmationOwner.ejs');
						const renderedHtmlOwner = await ejs.renderFile(templatePathOwner,{businessLocation, businessName, name, surname,orderPrice,subtotal,orderNumber,useremail,gsm,street,postcode,ort,note,nr,detailedOrderItemsFiltered,startDateFormatted,startHourFormatted,discount});
						const customerMailOptions = {
						from: 'metime@metime-schweiz.ch',
						to: useremail,
						subject: 'Bestellbestätigung Gastro Koçak Handel',
						html: renderedHtml,
						};
						await transporter.sendMail(customerMailOptions, (error, info) => {});
						
						const ownerMailOptions = {
						from: "metime@metime-schweiz.ch",
						to: ownermail,
						subject: 'Bestellbestätigung Gastro Koçak Handel',
						html: renderedHtmlOwner,
						};
						await transporter.sendMail(ownerMailOptions, (error, info) => {});

						const paymentStatusResult = "Success";
						res.render("paymentResult", {paymentStatusResult});
					} else {
						const paymentStatusResult = "Error";						
						res.render("paymentResult", {paymentStatusResult});			
					}
				} else if(status==='failed'){
					const paymentStatus = 'Failed';
					await Order.updateOne({ _id: orderID }, { $set: { paymentStatus } });
					await ScheduleModel.updateOne({ orderNumber: order.orderNumber }, { $set: { paymentStatus } });
					const paymentStatusResult = "Failed";					
					res.render("paymentResult", {paymentStatusResult});				
				} else if(status==='cancel'){
					const paymentStatus = 'Canceled';
					await Order.updateOne({ _id: orderID }, { $set: { paymentStatus } });
					await ScheduleModel.updateOne({ orderNumber: order.orderNumber }, { $set: { paymentStatus } });
					const paymentStatusResult = "Canceled";					
					res.render("paymentResult", {paymentStatusResult});
				}	
			} else {
				const paymentStatusResult = "Error";					
				res.render("paymentResult", {paymentStatusResult});				
			}

    } catch (error) {
		const paymentStatusResult = "Error";					
		res.render("paymentResult", {paymentStatusResult});				
    }
});

router.get('/workers/:businesID', async (req, res) => {
    try {
        const businessID = req.params.businesID;
        const availability = 'Available';
        const workers = await Workers.find({ businessID: businessID, availability: availability });

        if (workers && workers.length > 0) {
            const updatedWorkers = workers.map(worker => {
                const fullname = `${worker.name} ${worker.surname}`;
                return { ...worker.toObject(), fullname };
            });

            res.status(200).json(updatedWorkers);
        } else {
            res.status(200).json({ error: 'Arbeiter nicht gefunden' });
        }
    } catch (err) {
        console.error('Fehler beim Abrufen der Daten:', err);
        res.status(500).json({ error: 'Fehler beim Abrufen der Daten' });
    }
});
router.get('/worker/:workerID', async (req, res) => {
    try {
        const workerID = req.params.workerID;
        const availability = 'Available';
        const workers = await Workers.findOne({ _id: workerID, availability:availability });

        if (workers) {
            res.status(200).json(workers);
        } else {
            res.status(404).json({ error: 'Arbeiter nicht gefunden' });
        }
    } catch (err) {
        console.error('Fehler beim Abrufen der Daten:', err);
        res.status(500).json({ error: 'Fehler beim Abrufen der Daten' });
    }
});



router.get('/product/:productID', async (req, res) => {
    try {
        const productID = req.params.productID;
        const status = 'Active';
        const products = await Product.findOne({ _id: productID, status:status });

        if (products) {
            res.status(200).json(products);
        } else {
            res.status(404).json({ error: 'Produkt nicht gefunden' });
        }
    } catch (err) {
        console.error('Fehler beim Abrufen der Daten:', err);
        res.status(500).json({ error: 'Fehler beim Abrufen der Daten' });
    }
});
router.get('/order/:orderNumber', async (req, res) => {
    try {
        const orderNumber = req.params.orderNumber;
        const orders = await Order.findOne({ orderNumber: orderNumber });
        const calendardetail = await ScheduleModel.findOne({ orderNumber: orderNumber });

        if (orders) {
            res.status(200).json({orders,calendardetail});
        } else {
            res.status(404).json({ error: 'Produkt nicht gefunden' });
        }
    } catch (err) {
        console.error('Fehler beim Abrufen der Daten:', err);
        res.status(500).json({ error: 'Fehler beim Abrufen der Daten' });
    }
});
router.get('/campaigns', async (req, res) => {
    try {
        const currentDate = new Date();
        const campaigns = await Campaign.find();

        if (campaigns && campaigns.length > 0) {
            const activeCampaigns = campaigns.filter(async campaign => {
                const startDate = new Date(campaign.campaignStartDate);
                const endDate = new Date(campaign.campaignEndDate);
                return startDate <= currentDate && currentDate <= endDate;
            });

            const activeCampaignsWithDetails = await Promise.all(activeCampaigns.map(async campaign => {
                const businessID = campaign.businessID;
                const businessDetails = await Business.findOne({ _id: businessID });
                return { ...campaign.toObject(), businessDetails: businessDetails };
            }));

            res.status(200).json(activeCampaignsWithDetails);
        } else {
            res.status(200).json([]);
        }
    } catch (err) {
        console.error('Fehler beim Abrufen der Daten:', err);
        res.status(500).json({ error: 'Fehler beim Abrufen der Daten' });
    }
});
router.post('/listing-map', async (req, res) => {
    try {
        const selectedService = req.body.category;
        const gender = req.body.gender;
        const searchKey = req.body.searchKey;

        let businesses;
        let reviews;

        if (searchKey) {
            const regex = new RegExp(searchKey, 'i');
            const businessStatus = 'Active';
            businesses = await Business.find({ businessName: { $regex: regex }, businessStatus:businessStatus });
            const businessIDs = businesses.map((business) => business._id);
            reviews = await Reviews.find({ businessID: { $in: businessIDs } });
        } else {
            const businessStatus = 'Active';
            const status = 'Active';
            const serviceFilter = selectedService 
            ? { category: selectedService, serviceType: gender, status: status } 
            : { serviceType: gender, status: status };
            const services = await Service.find(serviceFilter);
            const businessIDs = services.map((service) => service.businessID);
            businesses = await Business.find({ _id: { $in: businessIDs }, businessStatus: businessStatus });
            reviews = await Reviews.find({ businessID: { $in: businessIDs } });
        }

        const businessMap = new Map();

        businesses.forEach((business) => {
            businessMap.set(business._id.toString(), {
                ...business.toObject(),
                averageReviewPoint: 0,
                reviewCount: 0,
            });
        });

        if (reviews) {
            reviews.forEach((review) => {
                const businessID = review.businessID.toString();
                if (businessMap.has(businessID)) {
                    const business = businessMap.get(businessID);
                    business.averageReviewPoint += parseInt(review.reviewPoint);
                    business.reviewCount += 1;
                }
            });

            for (const [businessID, business] of businessMap.entries()) {
                if (business.reviewCount > 0) {
                    business.averageReviewPoint /= business.reviewCount;
                    business.averageReviewPoint = parseFloat(business.averageReviewPoint.toFixed(1));
                }
            }
        }

        const businessesWithReviews = Array.from(businessMap.values());
        if (!businessesWithReviews || businessesWithReviews.length === 0) {
            res.status(404).json({ error: 'Unternehmen nicht gefunden' });
            return;
        }
        res.status(200).json(businessesWithReviews);
    } catch (err) {
        console.error('Fehler bei der Suche nach Unternehmen:', err);
        res.status(500).json({ error: 'interner Serverfehler' });
    }
});

router.post('/save-schedule', async (req, res) => {
    try {
        const { businessID, startDate, endDate, orderNumber, selectedWorkerID,customerName,customerSurname,orderNote,paymentStatus, duration,clientTel } = req.body;
        const newSchedule = new ScheduleModel({
            businessID,
            orderNumber,
            workerID:selectedWorkerID,
            startDate:startDate,
            endDate:endDate,
            customerName:customerName,
            customerSurname:customerSurname,
            paymentStatus:paymentStatus,
            duration:duration,
			clientTel:clientTel,
            orderNote:orderNote
        });
        await newSchedule.save();

        res.status(200).json({ message: 'Schedule saved successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'interner Serverfehler' });
    }
});


router.post('/edit-schedule', async (req, res) => {
    try {
        const { businessID, startDate, endDate, orderNumber, selectedWorkerID, customerName, customerSurname, orderNote, calendarID, clientTel } = req.body;
        console.log(calendarID)
        const updatedSchedule = await ScheduleModel.findOneAndUpdate(
            { _id: calendarID },
            {
                businessID: businessID,
                startDate: startDate,
                endDate: endDate,
                orderNumber: orderNumber,
                clientTel: clientTel,
                workerID: selectedWorkerID,
                customerName: customerName,
                customerSurname: customerSurname,
                orderNote: orderNote
            }
        );

        if (!updatedSchedule) {
            return res.status(404).json({ error: 'Schedule not found' });
        }

        res.status(200).json({ message: 'Schedule updated successfully', updatedSchedule });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal server error' });
    }
});
router.post('/delete-schedule', async (req, res) => {
    try {
        const { calendarID } = req.body;
        await ScheduleModel.findByIdAndRemove(calendarID);

        res.status(200).json({ message: 'Schedule deleted successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'interner Serverfehler' });
    }
});
router.post('/delete-schedule-fe', async (req, res) => {
    try {
        const { orderId } = req.body;
        
        const calendar = await ScheduleModel.findOne({ orderNumber: orderId });
        const order = await Order.findOne({ orderNumber: orderId });
        const business = await Business.findOne({ _id: calendar.businessID });
        const startDateFormatted = formatDate(calendar.startDate);
        const startHourFormatted = formatHour(calendar.startDate);

        const businessName=business.businessName;
        const ownermail='metime@metime-schweiz.ch';
        const orderNumber=order.orderNumber;
        const businessMail=business.businessMail;

        const templatePath = path.join(__dirname, '../routes/mail/orderCancel.ejs');
        const renderedHtml = await ejs.renderFile(templatePath,{businessName,orderNumber,startDateFormatted,startHourFormatted});
        const templatePathOwner = path.join(__dirname, '../routes/mail/orderCancel.ejs');
        const renderedHtmlOwner = await ejs.renderFile(templatePathOwner,{businessName,orderNumber,startDateFormatted,startHourFormatted});
        const customerMailOptions = {
        from: 'metime@metime-schweiz.ch',
        to: businessMail,
        subject: 'meTime-Auftragsstornierung',
        html: renderedHtml,
        };
        await transporter.sendMail(customerMailOptions, (error, info) => {});
        
        const ownerMailOptions = {
        from: "metime@metime-schweiz.ch",
        to: ownermail,
        subject: 'meTime-Auftragsstornierung',
        html: renderedHtmlOwner,
        };
        await transporter.sendMail(ownerMailOptions, (error, info) => {});
    

        //await ScheduleModel.findOneAndDelete({ orderNumber: orderId });
        await Order.findOneAndDelete({ orderNumber: orderId });
        res.status(200).json({ message: 'Schedule deleted successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'interner Serverfehler' });
    }
});


router.post("/admin-signin", async (req, res) => {
    try {
        const { username, password } = req.body;
        const admin = await Admin.findOne({ username });
        const authType='Admin';
        if (!admin) {
            return res.status(404).json({ error: "Benutzer nicht gefunden" });
        }
        const isPasswordMatch = await bcrypt.compare(password, admin.password);
        if (isPasswordMatch) {
            const { accessToken, refreshToken } = generateTokensAdmin(admin._id, admin.username, admin.businessID);
            return res.status(200).json({ accessToken, refreshToken, authType });
        } else {
            return res.status(500).json({ error: "Falsches Passwort" });
        }
    } catch (error) {
        console.error("Error in signin:", error);
        return res.status(500).json({ error: "Ein Fehler ist aufgetreten. Bitte kontaktieren Sie uns." });
    }
});
router.get('/getBusiness', authenticateTokenAdmin, async (req, res) => {
    try {
        const businessID = req.admin.businessID;
        const business = await Business.findOne({ _id: businessID});

        if (business) {
            res.status(200).json(business);
        } else {
            res.status(404).json({ error: 'Arbeiter nicht gefunden' });
        }
    } catch (err) {
        console.error('Fehler beim Abrufen der Daten:', err);
        res.status(500).json({ error: 'Fehler beim Abrufen der Daten' });
    }
});
router.get('/allWorkers',authenticateTokenAdmin, async (req, res) => {
    try {
        const businessID = req.admin.businessID;
        const workers = await Workers.find({ businessID: businessID });

        if (workers) {
            workers.forEach(worker => {
                worker.fullName = `${worker.name} ${worker.surname}`;
                
                for (const day in worker.hours) {
                    if (worker.hours.hasOwnProperty(day)) {
                        worker.hours[day].forEach(timeSlot => {
                            if (timeSlot.start) {
                                const startTime = new Date(`1970-01-01T${timeSlot.start}`);
                                startTime.setHours(startTime.getHours() + 1);
                                timeSlot.start = startTime.toTimeString().slice(0, 5);
                            }
                            if (timeSlot.end) {
                                const endTime = new Date(`1970-01-01T${timeSlot.end}`);
                                endTime.setHours(endTime.getHours() + 1);
                                timeSlot.end = endTime.toTimeString().slice(0, 5);
                            }
                        });
                    }
                }
            });
            const modifiedWorkers = workers.map(worker => ({
                _id: worker._id,
                name: worker.name,
                surname: worker.surname,
                fullName: worker.fullName,
                availability: worker.availability,
                hours: worker.hours,
                workerColor: worker.workerColor,
                businessID: worker.businessID,
            }));
            res.status(200).json(modifiedWorkers);
        } else {
            res.status(404).json({ error: 'Arbeiter nicht gefunden' });
        }
    } catch (err) {
        console.error('Fehler beim Abrufen der Daten:', err);
        res.status(500).json({ error: 'Fehler beim Abrufen der Daten' });
    }
});

router.post('/save-worker', authenticateTokenAdmin, async (req, res) => {
    try {
        const businessID = req.admin.businessID;
        const { name, surname, workerColor, availability, hours } = req.body;
        const orgHours=hours;
        for (const day in hours) {
            if (hours.hasOwnProperty(day)) {
                for (let i = 0; i < hours[day].length; i++) {
                    const timeSlot = hours[day][i];
                    if (timeSlot.start) {
                        const startTime = new Date(`1970-01-01T${timeSlot.start}`);
                        startTime.setHours(startTime.getHours() - 1);
                        timeSlot.start = startTime.toTimeString().slice(0, 5);
                    }
                    if (timeSlot.end) {
                        const endTime = new Date(`1970-01-01T${timeSlot.end}`);
                        endTime.setHours(endTime.getHours() - 1);
                        timeSlot.end = endTime.toTimeString().slice(0, 5);
                    }
                }
            }
        }
        const fullName = `${name} ${surname}`;
        const newWorker = new Workers({
            name,
            surname,
            fullName,
            businessID,
            workerColor,
            hours,
            availability
        });
        const savedWorker = await newWorker.save();
        const workerID=savedWorker._id;
        const workers=await Workers.findOne({_id:workerID});
        let modifiedWorkers;
        if (workers) {
            workers.fullName = `${workers.name} ${workers.surname}`;
            
            for (const day in workers.hours) {
                if (workers.hours.hasOwnProperty(day)) {
                    workers.hours[day].forEach(timeSlot => {
                        if (timeSlot.start) {
                            const startTime = new Date(`1970-01-01T${timeSlot.start}`);
                            startTime.setHours(startTime.getHours() + 1);
                            timeSlot.start = startTime.toTimeString().slice(0, 5);
                        }
                        if (timeSlot.end) {
                            const endTime = new Date(`1970-01-01T${timeSlot.end}`);
                            endTime.setHours(endTime.getHours() + 1);
                            timeSlot.end = endTime.toTimeString().slice(0, 5);
                        }
                    });
                }
            }
        }
        modifiedWorkers = {
            _id: workers._id,
            name: workers.name,
            surname: workers.surname,
            fullName: workers.fullName,
            availability: workers.availability,
            hours: workers.hours,
            workerColor: workers.workerColor,
            businessID: workers.businessID,
        };
        console.log(modifiedWorkers);
        res.status(200).json(modifiedWorkers);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal server error' });
    }
});



router.post('/edit-worker/:workerID', authenticateTokenAdmin, async (req, res) => {
    try {
        const workerID=req.params.workerID;
        const { name, surname, workerColor, availability, hours} = req.body;
        for (const day in hours) {
            if (hours.hasOwnProperty(day)) {
                for (let i = 0; i < hours[day].length; i++) {
                    const timeSlot = hours[day][i];
                    if (timeSlot.start) {
                        const startTime = new Date(`1970-01-01T${timeSlot.start}`);
                        startTime.setHours(startTime.getHours() - 1);
                        timeSlot.start = startTime.toTimeString().slice(0, 5);
                    }
                    if (timeSlot.end) {
                        const endTime = new Date(`1970-01-01T${timeSlot.end}`);
                        endTime.setHours(endTime.getHours() - 1);
                        timeSlot.end = endTime.toTimeString().slice(0, 5);
                    }
                }
            }
        }
        const fullName = `${name} ${surname}`;
        const updatedWorker = await Workers.findOneAndUpdate(
            { _id: workerID },
            {
                name: name,
                surname: surname,
                fullName: fullName,
                workerColor: workerColor,
                availability: availability,
                hours:hours
            }
        );
        if (!updatedWorker) {
            return res.status(404).json({ error: 'Worker not found' });
        }
        const workers=await Workers.findOne({_id:workerID});
        let modifiedWorkers;
        if (workers) {
            workers.fullName = `${workers.name} ${workers.surname}`;
            
            for (const day in workers.hours) {
                if (workers.hours.hasOwnProperty(day)) {
                    workers.hours[day].forEach(timeSlot => {
                        if (timeSlot.start) {
                            const startTime = new Date(`1970-01-01T${timeSlot.start}`);
                            startTime.setHours(startTime.getHours() + 1);
                            timeSlot.start = startTime.toTimeString().slice(0, 5);
                        }
                        if (timeSlot.end) {
                            const endTime = new Date(`1970-01-01T${timeSlot.end}`);
                            endTime.setHours(endTime.getHours() + 1);
                            timeSlot.end = endTime.toTimeString().slice(0, 5);
                        }
                    });
                }
            }
        }
        modifiedWorkers = {
            _id: workers._id,
            name: workers.name,
            surname: workers.surname,
            fullName: workers.fullName,
            availability: workers.availability,
            hours: workers.hours,
            workerColor: workers.workerColor,
            businessID: workers.businessID,
        };
        res.status(200).json(modifiedWorkers);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal server error' });
    }
});
router.get('/upcomingHolidays', authenticateTokenAdmin, async (req, res) => {
    try {
        const businessID = req.admin.businessID;
        const today = new Date();
        today.setHours(0, 0, 0, 0); 

        const holidays = await Holiday.find({ businessID: businessID });
        const upcomingHolidays = [];

        for (const holiday of holidays) {
            if (new Date(holiday.HolidayStartDate) >= today) {
                const workerIDs = holiday.workerID; 
                const workers = await Workers.find({ _id: { $in: workerIDs } });
                const workerName = workers.map(worker => `${worker.name} ${worker.surname}`).join(', ');
                upcomingHolidays.push({
                    ...holiday.toObject(),
                    workerName,
                });
            }
        }

        res.status(200).json(upcomingHolidays);
    } catch (err) {
        console.error('Fehler beim Abrufen der Daten:', err);
        res.status(500).json({ error: 'Fehler beim Abrufen der Daten' });
    }
});

router.get('/pastHolidays', authenticateTokenAdmin, async (req, res) => {
    try {
        const businessID = req.admin.businessID;
        const today = new Date();
        today.setHours(0, 0, 0, 0); 

        const holidays = await Holiday.find({ businessID: businessID });
        const pastHolidays = [];

        for (const holiday of holidays) {
            if (new Date(holiday.HolidayEndDate) < today) {
                const workerIDs = holiday.workerID; 
                const workers = await Workers.find({ _id: { $in: workerIDs } });
                const workerName = workers.map(worker => `${worker.name} ${worker.surname}`).join(', ');
                pastHolidays.push({
                    ...holiday.toObject(),
                    workerName,
                });
            } 
        }
        res.status(200).json(pastHolidays);
    } catch (err) {
        console.error('Fehler beim Abrufen der Daten:', err);
        res.status(500).json({ error: 'Fehler beim Abrufen der Daten' });
    }
});


router.post('/save-holiday',authenticateTokenAdmin, async (req, res) => {
    try {
        const businessID = req.admin.businessID;
        const { workerID, HolidayStartDate, HolidayEndDate } = req.body;
        const newHoliday = new Holiday({
            workerID,
            businessID,
            HolidayStartDate,
            HolidayEndDate
        });
        const holiday = await newHoliday.save();
        const worker = await Workers.findOne({_id:workerID});
        if (!worker) {
            return res.status(404).json({ error: 'Worker not found' });
        }
        const name = worker.name;
        const surname = worker.surname;
        const workerName = `${name} ${surname}`;
        const responseData = {
            ...holiday.toObject(),
            name,
            surname,
            workerName,
        };
        res.status(200).json(responseData);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});



router.post('/edit-holiday/:holidayID',authenticateTokenAdmin, async (req, res) => {
    try {
        const holidayID=req.params.holidayID;
        const { workerID, HolidayStartDate, HolidayEndDate} = req.body;
        const updatedHoliday = await Holiday.findOneAndUpdate(
            { _id: holidayID },
            {
                workerID: workerID,
                HolidayStartDate: HolidayStartDate,
                HolidayEndDate: HolidayEndDate
            }
        );
        if (!updatedHoliday) {
            return res.status(404).json({ error: 'Holiday not found' });
        }
        const holiday=await Holiday.findOne({_id:holidayID});
        const worker = await Workers.findOne({_id:workerID});
        if (!worker) {
            return res.status(404).json({ error: 'Worker not found' });
        }
        const name = worker.name;
        const surname = worker.surname;
        const workerName = `${name} ${surname}`;
        const responseData = {
            ...holiday.toObject(),
            name,
            surname,
            workerName,
        };
        res.status(200).json(responseData);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal server error' });
    }
});
router.post('/delete-holiday/:holidayID', authenticateTokenAdmin, async (req, res) => {
    try {
        const holidayID=req.params.holidayID;
        await Holiday.findByIdAndRemove(holidayID);

        res.status(200).json({ message: 'Holiday deleted successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'interner Serverfehler' });
    }
});
router.post('/delete-worker/:workerID', authenticateTokenAdmin, async (req, res) => {
    try {
        const workerID=req.params.workerID;
        await Workers.findByIdAndRemove(workerID);

        res.status(200).json({ message: 'Worker deleted successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'interner Serverfehler' });
    }
});
router.post('/refresh-admin', async (req, res) => {
    try {
        const token = req.body.token;
        const authType="Admin";
        jwt.verify(token, process.env.REFRESH_TOKEN_SECRET, (err, data) => {
            if (err) {
                return res.status(401).json(err);
            }
            const { accessToken, refreshToken } = generateTokensAdmin(data.id, data.username, data.businessID);
            return res.status(200).json({ accessToken, refreshToken, authType });
        });
    } catch (err) {
        console.error('Fehler beim Aktualisieren des Tokens:', err);
        res.status(500).json({ error: 'interner Serverfehler' });
    }
});

router.post('/save-event',authenticateTokenAdmin, async (req, res) => {
    try {
        const businessID = req.admin.businessID;
        const { workerID, customerName, customerSurname,clientTel,startDate,endDate,startHour,endHour,orderNote } = req.body;
        const duration = calculateDurationInMinutes(startHour, endHour);
        const paymentStatus="Success";
        const orderNumber=0;
        const newEvent = new ScheduleModel({
            businessID,
            workerID,
            paymentStatus,
            customerName,
            customerSurname,
            orderNote,
            orderNumber,
            duration,
            clientTel,
            startDate,
            endDate
        });        
        const event = await newEvent.save();
        const worker=await Workers.findOne({_id:workerID});
        const response = {
            id: event._id,
            title: event.orderNote,
            start: event.startDate,
            end: event.endDate,
            color: worker.workerColor,
            worker: {
                _id: event.workerID, 
                name: worker.name,
                surname: worker.surname,
                fullName: `${worker.name} ${worker.surname}`, 
                availability:worker.availability,
                businessID:businessID,
                workerColor: worker.workerColor,
            },
            clientTel:event.clientTel,
            customerName:event.customerName,
            customerSurname:event.customerSurname,
            startHour:startHour,
            endHour:endHour
        };
        res.status(200).json(response);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});
router.post('/edit-event',authenticateTokenAdmin, async (req, res) => {
    try {
        const businessID = req.admin.businesID;
        const { workerID, customerName, customerSurname,clientTel,startDate,endDate,startHour,endHour,orderNote,calendarID } = req.body;
        const duration = calculateDurationInMinutes(startHour, endHour);
        const updatedSchedule = await ScheduleModel.findOneAndUpdate(
            { _id: calendarID },
            {
                businessID: businessID,
                startDate: startDate,
                endDate: endDate,                
                clientTel: clientTel,
                duration: duration,
                workerID: workerID,
                customerName: customerName,
                customerSurname: customerSurname,
                orderNote: orderNote
            }
        );
        const schedule=await ScheduleModel.findOne({_id:calendarID})
        const worker=await Workers.findOne({_id:workerID});
        const response = {
            id: schedule._id,
            title: schedule.orderNote,
            start: schedule.startDate,
            end: schedule.endDate,
            color: worker.workerColor,
            worker: {
                _id: schedule.workerID, 
                name: worker.name,
                surname: worker.surname,
                fullName: `${worker.name} ${worker.surname}`, 
                availability:worker.availability,
                businessID:businessID,
                workerColor: worker.workerColor,
            },
            clientTel:schedule.clientTel,
            customerName:schedule.customerName,
            customerSurname:schedule.customerSurname,
            startHour:startHour,
            endHour:endHour
        };

        res.status(200).json(response);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal server error' });
    }
});
router.get('/get-calendar-data-worker-app/:startDate/:endDate',authenticateTokenAdmin, async (req, res) => {
    try {
        const businessID = req.admin.businessID;
        const workerID = req.query.workerID;
        const startDateString = req.params.startDate;
        const endDateString = req.params.endDate;
        const startD = new Date(startDateString);
        const endD = new Date(endDateString);
        endD.setHours(23, 59, 59, 999);
        const paymentStatus="Success";
        let calendarData;
        if(workerID){
            calendarData = await ScheduleModel.find({
                businessID: businessID,
                workerID: workerID,
                paymentStatus:paymentStatus,
                startDate: {
                    $gte: startD,
                    $lte: endD
                }
            });
        }else {
            calendarData = await ScheduleModel.find({
                businessID: businessID,
                paymentStatus:paymentStatus,
                startDate: {
                    $gte: startD,
                    $lte: endD
                }
            });
        }
        
        const calendarEvents = await Promise.all(calendarData.map(async (event) => {
            const workID = event.workerID;
            const worker = await Workers.findById(workID);
            return {
                id: event._id,
                title: event.orderNote,
                start: event.startDate,
                end: event.endDate,
                color:worker.workerColor,
                worker: {
                    _id: worker ? worker._id : null, 
                    name: worker ? worker.name : null,
                    surname: worker ? worker.surname : null,
                    fullName: worker ? `${worker.name} ${worker.surname}` : null,
                    availability: worker ? worker.availability : null,
                    businessID: worker ? worker.businessID : null,
                    workerColor: worker ? worker.workerColor : null,
                },
                clientTel: event.clientTel,
                customerName: event.customerName,
                customerSurname: event.customerSurname,
            };
        }));
        

        res.status(200).json(calendarEvents);
    } catch (err) {
        res.status(500).json({ error: err.message });
    } 
});

function convertToISODate(dateStr, hourStr) {    
    const combinedDateTimeStr = `${dateStr}T${hourStr}:00`;
    const date = new Date(combinedDateTimeStr);
    const ISODate = date.toISOString();
    return ISODate;
}
function calculateDurationInMinutes(startHour, endHour) {
    const [startHourStr, startMinuteStr] = startHour.split(':');
    const startHourNum = parseInt(startHourStr);
    const startMinuteNum = parseInt(startMinuteStr);
    const [endHourStr, endMinuteStr] = endHour.split(':');
    const endHourNum = parseInt(endHourStr);
    const endMinuteNum = parseInt(endMinuteStr);
    const startTotalMinutes = startHourNum * 60 + startMinuteNum;
    const endTotalMinutes = endHourNum * 60 + endMinuteNum;
    const durationMinutes = endTotalMinutes - startTotalMinutes;
    return durationMinutes;
}

router.get('/appOrdersPast',authenticateToken, async (req, res) => {
    try {
        let userID = req.user.id;
        const currentDate = new Date(); 
        currentDate.setHours(0, 0, 0, 0); 
        const orders = await Order.find({ userID, paymentStatus: 'Success' });
        if (orders.length === 0) {
            return res.status(200).json([]);
        } 
        const ordersPast = await Promise.all(orders.map(async order => {
            const event = await ScheduleModel.findOne({ orderNumber: order.orderNumber, paymentStatus: 'Success' });
            const business = await Business.findOne({ _id: order.businessID});

            if (event && new Date(event.startDate) < currentDate) {
                return {
                    ...order.toObject(),
                    startDate: event.startDate,
                    business: business,
                    endDate: event.endDate,
                    duration: event.duration,
                    orderNote: event.orderNote,
                    workerID: event.workerID
                };
            }
        }));
        const filteredOrders = ordersPast.filter(order => order);
        if (filteredOrders.length === 0) {
            return res.status(200).json({ error: 'Keine vergangenen Bestellungen gefunden.' });
        } 
        res.status(200).json(filteredOrders);
    } catch (err) {
        console.error(err);
        res.status(500).send('Interner Serverfehler');
    }
});
router.get('/appOrdersCurrent',authenticateToken, async (req, res) => {
    try {
        let userID = req.user.id;
        const currentDate = new Date(); 
        currentDate.setHours(0, 0, 0, 0); 
        const orders = await Order.find({ userID, paymentStatus: 'Success' });
        if (orders.length === 0) {
            return res.status(200).json([]);
        } 
        const ordersPast = await Promise.all(orders.map(async order => {
            const event = await ScheduleModel.findOne({ orderNumber: order.orderNumber, paymentStatus: 'Success' });
            const business = await Business.findOne({ _id: order.businessID});
            if (event && new Date(event.startDate) >= currentDate) {
                return {
                    ...order.toObject(),
                    startDate: event.startDate,
                    business: business,
                    endDate: event.endDate,
                    duration: event.duration,
                    orderNote: event.orderNote,
                    workerID: event.workerID
                };
            }
        }));
        const filteredOrders = ordersPast.filter(order => order);
        if (filteredOrders.length === 0) {
            return res.status(200).json({ error: 'Keine vergangenen Bestellungen gefunden.' });
        } 
        res.status(200).json(filteredOrders);
    } catch (err) {
        console.error(err);
        res.status(500).send('Interner Serverfehler');
    }
});
router.get('/orderDetail/:orderID',authenticateToken, async (req, res) => {
    try {
        const orderID = req.params.orderID;
        const order = await Order.findOne({ _id: orderID });
        if (!order) {
            return res.status(404).json({ error: 'Bestellung nicht gefunden' });
        }
        const orderNumber = order.orderNumber;
        const event = await ScheduleModel.findOne({ orderNumber });
        if (!event) {
            return res.status(404).json({ error: 'Zugehöriges Ereignis nicht gefunden' });
        }
        const combinedDetails = {
            ...order.toObject(),
            startDate: event.startDate,
            endDate: event.endDate,
            duration: event.duration,
            orderNote: event.orderNote,
            workerID: event.workerID
        };

        res.status(200).json(combinedDetails);
    } catch (err) {
        console.error(err);
        res.status(500).send('Interner Serverfehler');
    }
});

router.post('/delete-order',authenticateToken, async (req, res) => {
    try {
        const { orderID } = req.body;
        const order = await Order.findOne({ _id: orderID });
        const orderNumber=order.orderNumber;
        await ScheduleModel.findOneAndRemove({ orderNumber });
        await Order.findByIdAndRemove(orderID);
        

        res.status(200).json({ message: 'Order deleted successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'interner Serverfehler' });
    }
});

router.post("/order/check-coupon", async (req, res) => {
    try {
        const { couponCode, userID } = req.body;
        const orders = await Order.findOne({
            userID: userID,
            couponCode: couponCode
        });

        if (orders) {
            res.json({ used: true });
        } else {
            res.json({ used: false });
        }
    } catch (err) {
        console.error("Error checking coupon usage:", err);
        res.status(500).json({ error: "Internal Server Error" });
    }
});


module.exports = router;
