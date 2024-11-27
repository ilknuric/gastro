const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');

const path = require('path');
const multer = require('multer');
const ejs = require('ejs');
const fs = require('fs');
const nodemailer = require('nodemailer');
const User = require('../models/userModel');
const Brand = require('../models/brandModel');
const Reviews = require('../models/reviewModel');
const Admin = require('../models/adminModel');
const Category = require('../models/categoryModel');
const Business = require('../models/businessModel');
const Workers = require('../models/workerModel');
const Faq = require('../models/faqModel');
const About = require('../models/aboutModel');
const Service = require('../models/serviceModel');
const Mwst = require('../models/mwstModel');
const Agb = require('../models/agbModel');
const Impressum = require('../models/impressumModel');
const Product = require('../models/productModel');
const Orders = require('../models/orderModel');
const Application = require('../models/appModel');
const Promotion = require('../models/promoModel');
const Campaign = require('../models/campaignModel');
const ScheduleModel = require('../models/calendarModel');
const Process = require('../models/processModel');
const Slide = require('../models/slideModel');
const SlideWeb = require('../models/slideWebModel');
const Holiday = require('../models/holidayModel');
const Package = require('../models/packageModel');

const transporter = nodemailer.createTransport({
  host: 'mail.ilknurcengiz.com',
  port: 25,
  secure: true,
  auth: {
	  user: 'info@ilknurcengiz.com',
	  pass: 'Z@vCMkP!*wHg5',
  },
  tls: { 
    rejectUnauthorized: false 
  },
});
const createStorage = (destinationFolder, filePrefix) => {
  return multer.diskStorage({
    destination: function (req, file, cb) {
      cb(null, `public/assets/images/${destinationFolder}`);
    },
    filename: function (req, file, cb) {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      cb(null, `${filePrefix}-${uniqueSuffix}${path.extname(file.originalname)}`);
    },
  });
};
const upload = multer({ storage: createStorage('business', 'businessImage') });
const uploadproduct = multer({ storage: createStorage('business', 'productImage') });
const uploadBusiness = multer({ storage: createStorage('business', 'businessImage') });
const uploadSaloon = (req, res, next) => {
  uploadBusiness.array('businessImages', 5)(req, res, function (err) {
    if (err instanceof multer.MulterError) {
      console.error('Multer error:', err.message);
      return res.status(400).json({ error: `Multer error: ${err.message}` });
    } else if (err) {
      console.error('Internal Server Error:', err);
      return res.status(500).json({ error: 'Internal Server Error' });
    }
    next();
  });
};
const uploadProductImages = (req, res, next) => {
  uploadproduct.array('productImages', 10)(req, res, function (err) {
    if (err instanceof multer.MulterError) {
      console.error('Multer error:', err.message);
      return res.status(400).json({ error: `Multer error: ${err.message}` });
    } else if (err) {
      console.error('Internal Server Error:', err);
      return res.status(500).json({ error: 'Internal Server Error' });
    }
    next();
  });
};
function generateRandomPassword() {
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let newPassword = '';
  for (let i = 0; i < 12; i++) {
    newPassword += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  return newPassword;
}
function requireLogin(req, res, next) {
    if (req.session && req.session.adminId && req.session.auth==2) {
      next();
    } else {
      res.redirect('/admin/login');
    }
}
function requireSuperLogin(req, res, next) {
    if (req.session && req.session.adminId && req.session.auth==1) {
      next();
    } else {
      res.redirect('/admin/login');
    }
}
const checkLoggedInMiddleware = (req, res, next) => {
  if (req.session.userId) {
    return res.redirect('/');
  } else if(req.session.adminId) {
    return res.redirect('/admin/home');
  }
  next();
};
function adjustTime(time, hours) {
  const [hh, mm] = time.split(':');
  const adjustedHours = parseInt(hh, 10) + hours;
  const adjustedHH = Math.max(0, adjustedHours);
  
  return `${adjustedHH.toString().padStart(2, '0')}:${mm}`;
}
//LOGIN
router.get('/admin/', requireLogin, async (req, res) => {
  try {
    const businessID = req.session.businessID;
    const business = await Business.findOne({ _id: businessID });
    const auth =1;
    const businessCommision = await Business.findOne({ auth: auth });
    const orders = await Orders.find({businessID:businessID});

    if (orders.length === 0) {
      res.locals.req = req;
      res.locals.activePage = 'admin/';
      res.render('admin/', { orders: null, business, services:null, products:null });
    }   else {
      const separatedItems = orders.flatMap(order => order.orderItems.map(item => {
        if (item.productName) {
          return {
            type: 'product',
            name: item.productName,
            quantity: parseInt(item.quantity),
            price: parseFloat(item.price),
            _id: item._id,
            businessID: item.businessID
          };
        } else if (item.serviceName) {
          return {
            type: 'service',
            name: item.serviceName,
            quantity: parseInt(item.quantity),
            price: parseFloat(item.price),
            _id: item._id,
            businessID: item.businessID
          };
        }
      }));
      const itemsWithBusinessInfo = await Promise.all(separatedItems.map(async (item) => {
        const business = await Business.findOne({ _id: item.businessID });
        if (business) {
          return {
            ...item,
            businessName: business.businessName,
            businessLocation: business.businessLocation
          };
        } else {
          return item;
        }
      }));
      const productResult = itemsWithBusinessInfo.reduce((acc, item) => {
        if (item.type === 'product') {
          const key = `${item._id}`;
          if (!acc[key]) {
            acc[key] = {
              type: item.type,
              name: item.name,
              _id: item._id,
              businessID: item.businessID,
              businessName: item.businessName,
              businessLocation: item.businessLocation,
              totalQuantity: 0,
              totalPrice: 0
            };
          }
          acc[key].totalQuantity += item.quantity;
          acc[key].totalPrice += item.price * item.quantity;
        }
        return acc;
      }, {});

      const productSales = Object.values(productResult);
      const serviceResult = itemsWithBusinessInfo.reduce((acc, item) => {
        if (item.type === 'service') {
          const key = `${item._id}`;
          if (!acc[key]) {
            acc[key] = {
              type: item.type,
              name: item.name,
              _id: item._id,
              businessID: item.businessID,
              businessName: item.businessName,
              businessLocation: item.businessLocation,
              totalQuantity: 0,
              totalPrice: 0
            };
          }
          acc[key].totalQuantity += item.quantity;
          acc[key].totalPrice += item.price * item.quantity;
        }
        return acc;
      }, {});

      const serviceSales = Object.values(serviceResult);

      res.locals.req = req;
      res.locals.activePage = 'admin/';
      res.render('admin/', { business, services: serviceSales, products: productSales,businessCommision });
    }
  } catch (err) {
    console.error(err);
    res.status(500).send('Internal Server Error');
  }
});
router.get('/admin/home', requireSuperLogin, async (req, res) => {
  try {
    const businessStatus = 'Waiting';
    const applications = await Application.find({ businessStatus: businessStatus });
    const businessID = req.session.businessID;
    const business = await Business.findOne({ _id: businessID });
    const orders = await Orders.find();

    if (orders.length === 0) {
      res.locals.req = req;
      res.locals.activePage = 'admin/home';
      res.render('admin/home', { orders: null, business, applications, services:null, products:null, businessSales:null });
    }   else {
      const separatedItems = orders.flatMap(order => order.orderItems.map(item => {
        if (item.productName) {
          return {
            type: 'product',
            name: item.productName,
            quantity: parseInt(item.quantity),
            price: parseFloat(item.price),
            _id: item._id,
            businessID: item.businessID
          };
        } else if (item.serviceName) {
          return {
            type: 'service',
            name: item.serviceName,
            quantity: parseInt(item.quantity),
            price: parseFloat(item.price),
            _id: item._id,
            businessID: item.businessID
          };
        }
      }));
      const itemsWithBusinessInfo = await Promise.all(separatedItems.map(async (item) => {
        const business = await Business.findOne({ _id: item.businessID });
        if (business) {
          return {
            ...item,
            businessName: business.businessName,
            businessLocation: business.businessLocation
          };
        } else {
          return item;
        }
      }));
      const productResult = itemsWithBusinessInfo.reduce((acc, item) => {
        if (item.type === 'product') {
          const key = `${item._id}`;
          if (!acc[key]) {
            acc[key] = {
              type: item.type,
              name: item.name,
              _id: item._id,
              businessID: item.businessID,
              businessName: item.businessName,
              businessLocation: item.businessLocation,
              totalQuantity: 0,
              totalPrice: 0
            };
          }
          acc[key].totalQuantity += item.quantity;
          acc[key].totalPrice += item.price * item.quantity;
        }
        return acc;
      }, {});

      const productSales = Object.values(productResult);
      const serviceResult = itemsWithBusinessInfo.reduce((acc, item) => {
        if (item.type === 'service') {
          const key = `${item._id}`;
          if (!acc[key]) {
            acc[key] = {
              type: item.type,
              name: item.name,
              _id: item._id,
              businessID: item.businessID,
              businessName: item.businessName,
              businessLocation: item.businessLocation,
              totalQuantity: 0,
              totalPrice: 0
            };
          }
          acc[key].totalQuantity += item.quantity;
          acc[key].totalPrice += item.price * item.quantity;
        }
        return acc;
      }, {});

      const serviceSales = Object.values(serviceResult);
      const businessResult = itemsWithBusinessInfo.reduce((acc, item) => {
        const key = `${item.businessID}`;
        if (!acc[key]) {
          acc[key] = {
            businessID: item.businessID,
            businessName: item.businessName,
            businessLocation: item.businessLocation,
            totalPrice: 0,
            totalQuantity: 0
          };
        }
        acc[key].totalPrice += item.price * item.quantity;
        acc[key].totalQuantity += item.quantity;
        return acc;
      }, {});

      const businessSales = Object.values(businessResult);

      res.locals.req = req;
      res.locals.activePage = 'admin/home';
      res.render('admin/home', { business, applications, services: serviceSales, products: productSales, businessSales });
    }
  } catch (err) {
    console.error(err);
    res.status(500).send('Internal Server Error');
  }
});
router.get('/admin/login', checkLoggedInMiddleware,  (req, res) => {
    const loginError = req.session.loginError;
    const loginSuccess = req.session.loginSuccess;
    req.session.loginError = null;
    req.session.loginSuccess = null;
    res.render('admin/login',{loginSuccess,loginError});  
});
router.get('/admin/forgot-password', (req, res) => {
    const loginError = req.session.loginError;
    const loginSuccess = req.session.loginSuccess;
    req.session.loginError = null; 
    req.session.loginSuccess = null; 
    res.render('admin/forgot-password',{loginError,loginSuccess});  
});
router.post("/adminlogin", async (req, res) => {
  try {
    const { username, password } = req.body;
    const user = await Admin.findOne({ username });

    if (!user) {
      req.session.loginError = "Benutzer nicht gefunden";
      return res.redirect('/admin/login');
    } else {
      const isPasswordMatch = await bcrypt.compare(password, user.password);

      if (isPasswordMatch) {
        req.session.adminId = user._id;
        req.session.auth = user.auth;
        req.session.businessID = user.businessID;
        if (user.auth == 1) {
          return res.redirect("/admin/home");  
        } else {
          return res.redirect("/admin/");
        }
      } else {
        req.session.loginError = "Falsches Passwort";
        return res.redirect('/admin/login');
      }
    }
  } catch (error) {
    console.error("Login error:", error);
    req.flash('error', 'An error occurred. Please contact us!');
    return res.redirect('/admin/login');
  }
});
router.post("/forgotPassword", async (req, res) => {
  try {
    const { email } = req.body;
    const business = await Business.findOne({ businessMail: email });

    if (!business) {
      req.session.loginError = "Diese E-Mail ist nicht registriert";
      return res.redirect('/admin/forgot-password');
    } else {
        const businessID = business._id;
        const user = await Admin.findOne({ businessID: businessID });
        const newPassword = generateRandomPassword(); 
        const hashedPassword = await bcrypt.hash(newPassword, 10);
        user.password = hashedPassword;
        await user.save();
        const username = user.username;
        const templatePath = path.join(__dirname, 'mail/adminPasswordReset.ejs');
        const renderedHtml = await ejs.renderFile(templatePath, { username, password: newPassword });
        const customerMailOptions = {
          from: 'info@ilknurcengiz.com',
          to: business.businessMail,
          subject: `Zurücksetzen des me Time-Administratorkennworts`,
          html: renderedHtml,
        };
  
        await transporter.sendMail(customerMailOptions, (error, info) => {
          if (error) {
            req.session.loginError = "Ein Fehler ist aufgetreten. Bitte kontaktieren Sie uns!";
            return res.redirect('/admin/forgot-password');
          } else {
            req.session.loginSuccess = "Neues Passwort an Ihre E-Mail gesendet";
            return res.redirect('/admin/forgot-password');
          }
        });
    }
  } catch (error) {
    console.error("Login error:", error);
    req.flash('error', 'An error occurred. Please contact us!');
    return res.redirect('/admin/login');
  }
});
router.get('/admin/logout', (req, res) => {
    delete req.session.businessID; 
    delete req.session.adminId; 
    delete req.session.auth; 
    res.redirect('/admin/login');
});
//PRODUCTS
router.get('/admin/products', requireSuperLogin, async (req, res) => {
  try {
    const businessID = req.session.businessID;
    const products = await Product.find();
    const business = await Business.findOne({ _id: businessID });

    if (products.length === 0) {
      res.locals.req = req;
      res.locals.activePage = 'admin/products';
      res.render('admin/products', { products: null, business });
    } else {
      const productsWithDetails = [];
      for (const product of products) {
        const category = await Category.findById(product.category);
        const categoryDisplayName = category ? category.categoryName : 'Unknown';
        const packageData = await Package.findById(product.package);
        const packageDisplayName = packageData ? packageData.packageName : 'Unknown';
        const productWithDetails = {
          ...product.toObject(),
          category: categoryDisplayName,
          packageName: packageDisplayName,
        };
        productsWithDetails.push(productWithDetails);
      }

      res.locals.req = req;
      res.locals.activePage = 'admin/products';
      res.render('admin/products', { products: productsWithDetails, business });
    }
  } catch (err) {
    console.error(err);
    res.status(500).send('Error: ' + err.message);
  }
});
router.get('/admin/add-product', requireSuperLogin, async (req, res) => {
  try {
    const categories = await Category.find();
    const package = await Package.find();
    const brands = await Brand.find();
    const businessID = req.session.businessID;
    const business = await Business.findOne({ _id: businessID });

    if (categories.length === 0) {
      res.locals.req = req;
      res.locals.activePage = 'admin/products';
      res.render('admin/add-product', {  categories: null,business,brands,package });
    } else {
      res.locals.req = req;
      res.locals.activePage = 'admin/products';
      res.render('admin/add-product', {  categories, business,brands,package });
    }
  } catch (err) {
    console.error(err);
    res.status(500).send('Error: ' + err.message);
  }
});
router.post("/admin/add-new-product",requireSuperLogin, uploadProductImages, async (req, res) => {
    try {
      const businessID = req.session.businessID;
      const { productName, description, price, status, category, brandName, package } = req.body;
      const productImages = req.files.map(file => `http://localhost:3001/assets/images/business/${file.filename}`);

      const newProduct = new Product({
        productName: productName,
        brandName: brandName,
        description: description,
        price: price,
        status: status,
        category: category,
        businessID: businessID,
        package: package,
        productImages: productImages, 
      });

      await newProduct.save();
      res.locals.activePage = "admin/products";
      return res.redirect("/admin/products");
    } catch (error) {
      console.error("Error:", error);
      req.session.error = "An error occurred. Please contact us!";
      return res.redirect("/admin/products");
    }
  }
);
router.post("/admin/delete-product-image", requireSuperLogin, async (req, res) => {
  try {
      const { imageUrl, productId } = req.body;
      const product = await Product.findById(productId);
      if (!product) {
          return res.status(404).json({ success: false, message: "Ürün bulunamadı." });
      }
      product.productImages = product.productImages.filter(image => image !== imageUrl);
      await product.save();
      const filePath = path.join(__dirname, "../public/assets/images/business", path.basename(imageUrl));
      fs.unlink(filePath, (err) => {
          if (err) console.error("Dosya silinirken hata:", err);
      });

      res.json({ success: true });
  } catch (err) {
      console.error(err);
      res.status(500).json({ success: false, message: "Bir hata oluştu." });
  }
});

router.get('/admin/edit-product/:productID', requireSuperLogin,  async (req, res) => {
  try {
    const productID = req.params.productID;
    const products = await Product.findOne({ _id: productID });
    const brands = await Brand.find();
    const package = await Package.find();
    const categories = await Category.find();
    const businessID = req.session.businessID;
    const business = await Business.findOne({ _id: businessID });
    
    if (!products) {
      return res.status(404).send('Service not found');
    }
    res.locals.req = req;
    res.locals.activePage = 'admin/products';
    res.render('admin/edit-product', { products, categories, business,brands,package });
  } catch (err) {
    console.error(err);
    res.status(500).send('Internal Server Error');
  }
}); 
router.post('/admin/edit-product/:productID', requireSuperLogin, upload.array('productImage', 10), async (req, res) => {
  try {
      const productID = req.params.productID;
      const businessID = req.session.businessID;
      const { productName, description, price, status, category, brandName, package } = req.body;
      const products = await Product.findById(productID);

      if (!products) {
          req.session.error = 'Product not found';
          return res.redirect('/admin/products');
      }
      let productImages = products.productImages || [];
      if (req.files && req.files.length > 0) {
          const newImages = req.files.map(file => 'http://localhost:3001/assets/images/business/' + file.filename);
          productImages = [...productImages, ...newImages]; 
      }
      products.productName = productName;
      products.package = package;
      products.brandName = brandName;
      products.description = description;
      products.price = price;
      products.status = status;
      products.category = category;
      products.businessID = businessID;
      products.productImages = productImages;

      await products.save();
      res.locals.activePage = 'admin/products';
      return res.redirect('/admin/products');
  } catch (error) {
      console.error('Error:', error);
      req.session.error = 'An error occurred. Please contact us!';
      return res.redirect('/admin/products');
  }
});

router.get('/admin/delete-product/:productID', async (req, res) => {
  try {
    const productID = req.params.productID;
    await Product.findByIdAndRemove(productID);
    res.locals.req = req;
    res.locals.activePage = 'admin/products'; 
    return res.redirect('/admin/products');
  } catch (error) {
    console.error("Error:", error);
    req.session.error = "An error occurred. Please contact us!";
    return res.redirect('/admin/products'); 
  }
});
//CATEGORY
router.get('/admin/categories', requireSuperLogin, async (req, res) => {
  try {
    const categories = await Category.find();
    const mwst = await Mwst.find();
    const businessID = req.session.businessID;
    const business = await Business.findOne({ _id: businessID });
    const businessStatus = 'Waiting';
    const applications = await Application.find({ businessStatus: businessStatus });
    if (categories.length === 0) {
      res.locals.req = req;
      res.locals.activePage = 'admin/categories';
      res.render('admin/categories', {  categories: null,business,applications });
    } else {
      res.locals.req = req;
      res.locals.activePage = 'admin/categories';
      res.render('admin/categories', {  categories,business,applications,mwst });
    }
  } catch (err) {
    console.error(err);
    res.status(500).send('Error: ' + err.message);
  }
});
router.get('/admin/add-categories', requireSuperLogin, async (req, res) => {
  try {
    const mwst = await Mwst.find();
    const businessID = req.session.businessID;
    const business = await Business.findOne({ _id: businessID });
    const businessStatus = 'Waiting';
    const applications = await Application.find({ businessStatus: businessStatus });
    if (mwst.length === 0) {
      res.locals.req = req;
      res.locals.activePage = 'admin/categories';
      res.render('admin/add-categories', {  mwst: null, business,applications });
    } else {
      res.locals.req = req;
      res.locals.activePage = 'admin/categories';
      res.render('admin/add-categories', {  mwst, business,applications });
    }
  } catch (err) {
    console.error(err);
    res.status(500).send('Error: ' + err.message);
  }
});
router.post("/admin/add-new-category", requireSuperLogin, uploadproduct.single('categoryImage'), async (req, res) => {
  try {
      const categoryImage = req.file ? 'http://localhost:3001/assets/images/business/' + req.file.filename : null;
      const { categoryName, mwstID } = req.body;
      const mwst = await Mwst.findOne({_id:mwstID});
      const newCategory = new Category({
        categoryName: categoryName,
        categoryImage: categoryImage,
        mwstID: mwstID,
        mwstName: mwst.mwstName,
        mwstOption: mwst.mwstRatio,
      });
      await newCategory.save();
      res.locals.activePage = 'admin/categories'; 
      return res.redirect('/admin/categories');
  } catch (error) {
      console.error("Error:", error);
      req.session.error = "An error occurred. Please contact us!";
      return res.redirect('/admin/categories'); 
  }
});
router.get('/admin/edit-category/:categoryID', requireSuperLogin, async (req, res) => {
    try {
      const categoryID = req.params.categoryID;
      const category = await Category.findOne({ _id: categoryID });
      const mwst = await Mwst.find();
      const businessID = req.session.businessID;
      const business = await Business.findOne({ _id: businessID });
      const businessStatus = 'Waiting';
      const applications = await Application.find({ businessStatus: businessStatus });
      if (!category) {
        return res.status(404).send('Category not found');
      }
      res.locals.req = req;
      res.locals.activePage = 'admin/categories';
      res.render('admin/edit-category', { category, mwst, business,applications });
    } catch (err) {
      console.error(err);
      res.status(500).send('Internal Server Error');
    }
});
router.get('/admin/delete-category/:categoryID', async (req, res) => {
  try {
    const categoryID = req.params.categoryID;
    await Category.findByIdAndRemove(categoryID);

    res.locals.req = req;
    res.locals.activePage = 'admin/categories'; 
    return res.redirect('/admin/categories');
  } catch (error) {
    console.error("Error:", error);
    req.session.error = "An error occurred. Please contact us!";
    return res.redirect('/admin/categories'); 
  }
});
router.post('/admin/edit-category/:categoryID', requireSuperLogin, upload.single('categoryImage'), async (req, res) => {
    try {
        const categoryId = req.params.categoryID;
        const { categoryName, mwstID } = req.body;
        const category = await Category.findById(categoryId);
        const mwst = await Mwst.findOne({_id:mwstID});
        const categoryImage = req.file ? 'http://localhost:3001/assets/images/business/' + req.file.filename : category.categoryImage;
      
        if (!category) {
            req.session.error = 'Category not found';
            return res.redirect('/admin/categories');
        }
        category.categoryImage = categoryImage;
        category.categoryName = categoryName;
        category.mwstID = mwstID;
        category.mwstName = mwst.mwstName;		
        category.mwstOption = mwst.mwstRatio;				
        await category.save();

        res.locals.activePage = 'admin/categories';
        return res.redirect('/admin/categories');
    } catch (error) {
        console.error('Error:', error);
        req.session.error = 'An error occurred. Please contact us!';
        return res.redirect('/admin/categories');
    }
});
//BRANDS
router.get('/admin/brands', requireSuperLogin, async (req, res) => {
  try {
    const brands = await Brand.find();
    const businessID = req.session.businessID;
    const business = await Business.findOne({ _id: businessID });
    if (brands.length === 0) {
      res.locals.req = req;
      res.locals.activePage = 'admin/brands';
      res.render('admin/brands', {  brands: null,business });
    } else {
      res.locals.req = req;
      res.locals.activePage = 'admin/brands';
      res.render('admin/brands', {  brands,business });
    }
  } catch (err) {
    console.error(err);
    res.status(500).send('Error: ' + err.message);
  }
});
router.get('/admin/add-brands', requireSuperLogin, async (req, res) => {
  try {
    const brands = await Brand.find();
    const businessID = req.session.businessID;
    const business = await Business.findOne({ _id: businessID });
    const businessStatus = 'Waiting';
    const applications = await Application.find({ businessStatus: businessStatus });
    if (brands.length === 0) {
      res.locals.req = req;
      res.locals.activePage = 'admin/brands';
      res.render('admin/add-brands', {  brands: null, business,applications });
    } else {
      res.locals.req = req;
      res.locals.activePage = 'admin/brands';
      res.render('admin/add-brands', {  brands, business,applications });
    }
  } catch (err) {
    console.error(err);
    res.status(500).send('Error: ' + err.message);
  }
});
router.post("/admin/add-new-brand", requireSuperLogin, async (req, res) => {
  try {
      const { brandName } = req.body;
      const newBrand = new Brand({
        brandName: brandName,
      });
      await newBrand.save();
      res.locals.activePage = 'admin/brands'; 
      return res.redirect('/admin/brands');
  } catch (error) {
      console.error("Error:", error);
      req.session.error = "An error occurred. Please contact us!";
      return res.redirect('/admin/brands'); 
  }
});
router.get('/admin/edit-brand/:brandID', requireSuperLogin, async (req, res) => {
  try {
    const brandID = req.params.brandID;
    const brand = await Brand.findOne({ _id: brandID });
    const businessID = req.session.businessID;
    const business = await Business.findOne({ _id: businessID });
    const businessStatus = 'Waiting';
    const applications = await Application.find({ businessStatus: businessStatus });
    if (!brand) {
      return res.status(404).send('Brand not found');
    }
    res.locals.req = req;
    res.locals.activePage = 'admin/brands';
    res.render('admin/edit-brand', { brand, business,applications });
  } catch (err) {
    console.error(err);
    res.status(500).send('Internal Server Error');
  }
});
router.post('/admin/edit-brand/:brandID', requireSuperLogin, async (req, res) => {
  try {
      const brandId = req.params.brandID;
      const { brandName } = req.body;
      const brand = await Brand.findById(brandId);

      if (!brand) {
          req.session.error = 'Brand not found';
          return res.redirect('/admin/brands');
      }
      brand.brandName = brandName;	
      await brand.save();
      res.locals.activePage = 'admin/brands';
      return res.redirect('/admin/brands');
  } catch (error) {
      console.error('Error:', error);
      req.session.error = 'An error occurred. Please contact us!';
      return res.redirect('/admin/brands');
  }
});
router.get('/admin/delete-brand/:brandID', async (req, res) => {
  try {
    const brandID = req.params.brandID;
    await Brand.findByIdAndRemove(brandID);

    res.locals.req = req;
    res.locals.activePage = 'admin/brands'; 
    return res.redirect('/admin/brands');
  } catch (error) {
    console.error("Error:", error);
    req.session.error = "An error occurred. Please contact us!";
    return res.redirect('/admin/brands'); 
  }
});
//SETTINGS
router.get('/admin/settings', requireSuperLogin, async (req, res) => {
  try {
    const businessID = '673bda0ff018e034f5a43e9c';
    const business = await Business.findOne({ _id: businessID });
    res.locals.req = req;
    res.locals.activePage = 'admin/settings';
    res.render('admin/settings', { business,businessID });
  } catch (err) {
    console.error(err);
    res.status(500).send('Internal Server Error');
  }
});
router.get('/admin/admin-settings', requireSuperLogin, async (req, res) => {
  try {
    const businessID = req.session.businessID;
    const business = await Business.findOne({ _id: businessID });
    const businessStatus = 'Waiting';
    const applications = await Application.find({ businessStatus: businessStatus });
    res.locals.req = req;
    res.locals.activePage = 'admin/admin-settings';
    res.render('admin/admin-settings', { business, applications });
  } catch (err) {
    console.error(err);
    res.status(500).send('Internal Server Error');
  }
});
router.post('/admin/edit-admin-business/:businessID', requireSuperLogin, upload.single('businessImage'), async (req, res) => {
  try {
      const businessID = req.params.businessID;
      const {
          businessName,
          businessFirstname,
          businessSurname,
          businessMail,
          businessTel,
          businessWebsite,
          socialFacebook,
          socialInstagram,
          businessStreet,
          businessNr,
          businessPostcode,
          businessOrt,
          businessLat,
          businessLong,
          commisionRate,
          auth,
      } = req.body;

      const business = await Business.findById(businessID);
      const businessLocation = businessStreet + ' ' + businessNr + ', ' + businessPostcode + ', ' + businessOrt;

      business.businessName = businessName;
      business.businessFirstname = businessFirstname;
      business.businessSurname = businessSurname;
      business.businessMail = businessMail;
      business.businessTel = businessTel;
      business.businessWebsite = businessWebsite;
      business.socialFacebook = socialFacebook;
      business.socialInstagram = socialInstagram;
      business.businessStreet = businessStreet;
      business.businessNr = businessNr;
      business.businessPostcode = businessPostcode;
      business.businessOrt = businessOrt;
      business.businessLat = businessLat;
      business.businessLong = businessLong;
      business.businessLocation = businessLocation;
      business.commisionRate = commisionRate;
      business.auth = auth;
      if (req.file) {
          business.businessImage = 'http://localhost:3001/assets/images/business/' + req.file.filename;
      }

      await business.save();

      res.locals.activePage = 'admin/admin-settings';
      return res.redirect('/admin/admin-settings');
  } catch (error) {
      console.error('Error:', error);
      req.session.error = 'An error occurred. Please contact us!';
      return res.redirect('/admin/admin-settings');
  }
});
router.post('/admin/edit-business/:businessID', requireSuperLogin, async (req, res) => {
  try {
      const businessID = req.params.businessID;
      const {businessName,businessMail,businessTel,businessStreet,businessNr,businessPostcode,businessOrt,businessHour} = req.body;

      const business = await Business.findById(businessID);
      const businessLocation = businessStreet + ' ' + businessNr + ', ' + businessPostcode + ', ' + businessOrt;
      console.log(req.body);

      business.businessName = businessName;
      business.businessMail = businessMail;
      business.businessTel = businessTel;
      business.businessStreet = businessStreet;
      business.businessNr = businessNr;
      business.businessPostcode = businessPostcode;
      business.businessOrt = businessOrt;
      business.businessLocation = businessLocation;
      business.businessHour = businessHour;

      await business.save();

      res.locals.activePage = 'admin/settings';
      return res.redirect('/admin/settings');
  } catch (error) {
      console.error('Error:', error);
      req.session.error = 'An error occurred. Please contact us!';
      return res.redirect('/admin/settings');
  }
});
router.get('/admin/security', requireSuperLogin, async (req, res) => {
  try {
	  	  const passError = req.session.passError;
    req.session.passError = null;
	  	  	  const passSuccess = req.session.passSuccess;
    req.session.passSuccess = null;
    const businessID = req.session.businessID;
    const business = await Business.findOne({ _id: businessID });
    const admin = await Admin.findOne({ businessID: businessID });

    res.locals.req = req;
    res.locals.activePage = 'admin/settings';
    res.render('admin/security', { business, admin, passError,passSuccess });
  } catch (err) {
    console.error(err);
    res.status(500).send('Internal Server Error');
  }
});
router.get('/admin/admin-security', requireSuperLogin, async (req, res) => {
  try {
	  const passError = req.session.passError;
    req.session.passError = null;
	  	  const passSuccess = req.session.passSuccess;
    req.session.passSuccess = null;
    const businessID = req.session.businessID;
    const business = await Business.findOne({ _id: businessID });
    const admin = await Admin.findOne({ businessID: businessID });
    const businessStatus = 'Waiting';
    const applications = await Application.find({ businessStatus: businessStatus });

    res.locals.req = req;
    res.locals.activePage = 'admin/settings';
    res.render('admin/admin-security', { business, admin, applications,passError, passSuccess });
  } catch (err) {
    console.error(err);
    res.status(500).send('Internal Server Error');
  }
});
router.post('/admin/edit-adminentrance/:adminID', requireSuperLogin, async (req, res) => {
  try {
      const adminID = req.params.adminID;
      const admin = await Admin.findOne({ _id:adminID });
      const { username, currentPassword, newPasswordOne, newPasswordTwo } = req.body;

      if (!admin) {
req.session.passError = "Admin-Benutzer nicht gefunden";
          return res.redirect('/admin/admin-security');
      }
      const isPasswordValid = await bcrypt.compare(currentPassword, admin.password);
      if (!isPasswordValid) {
req.session.passError = "Das aktuelle Passwort ist nicht korrekt";
          return res.redirect('/admin/admin-security');
      }
      if (newPasswordOne !== newPasswordTwo) {
req.session.passError = "Passwörter stimmten nicht überein";
        return res.redirect('/admin/admin-security');
      }
req.session.passError = null;
      req.session.passSuccess = "das Passwort wurde erfolgreich geändert";
      admin.username = username;
      admin.password = await bcrypt.hash(newPasswordOne, 10);
      await admin.save();

      res.locals.activePage = 'admin/admin-security';
      return res.redirect('/admin/admin-security');
  } catch (error) {
      console.error('Error:', error);
      res.status(500).send('Internal Server Error: ' + error.message);
  }
});
router.post('/admin/edit-userentrance/:adminID', requireSuperLogin, async (req, res) => {
    try {
        const adminID = req.params.adminID;
        const admin = await Admin.findOne({ _id:adminID });
        const { username, currentPassword, newPasswordOne, newPasswordTwo } = req.body;

        if (!admin) {
req.session.passError = "Admin-Benutzer nicht gefunden";
          return res.redirect('/admin/security');
        }
        const isPasswordValid = await bcrypt.compare(currentPassword, admin.password);
        if (!isPasswordValid) {
req.session.passError = "Das aktuelle Passwort ist nicht korrekt";
          return res.redirect('/admin/security');
        }
        if (newPasswordOne !== newPasswordTwo) {
req.session.passError = "Passwörter stimmten nicht überein";
        return res.redirect('/admin/security');
        }
req.session.passError = null;
      req.session.passSuccess = "das Passwort wurde erfolgreich geändert";
        admin.username = username;
        admin.password = await bcrypt.hash(newPasswordOne, 10);
        await admin.save();

        res.locals.activePage = 'admin/security';
        return res.redirect('/admin/security');
    } catch (error) {
        console.error('Error:', error);
        res.status(500).send('Internal Server Error: ' + error.message);
    }
});
//FAQ
router.get('/admin/faq', requireSuperLogin, async (req, res) => {
  try {
    const faq = await Faq.find();
    const businessID = req.session.businessID;
    const business = await Business.findOne({ _id: businessID });
    const businessStatus = 'Waiting';
    const applications = await Application.find({ businessStatus: businessStatus });
    if (faq.length === 0) {
      res.locals.req = req;
      res.locals.activePage = 'admin/faq';
      res.render('admin/faq', {  faq: null, business, applications });
    } else {
      res.locals.req = req;
      res.locals.activePage = 'admin/faq';
      res.render('admin/faq', {  faq, business,applications });
    }
  } catch (err) {
    console.error(err);
    res.status(500).send('Error: ' + err.message);
  }
});
router.get('/admin/add-faq', requireSuperLogin, async (req, res) => {
  try {
    const businessID = req.session.businessID;
    const business = await Business.findOne({ _id: businessID });
    const businessStatus = 'Waiting';
    const applications = await Application.find({ businessStatus: businessStatus });
    res.locals.req = req;
    res.locals.activePage = 'admin/faq';
    res.render('admin/add-faq', { business,applications });
  } catch (err) {
    console.error(err);
    res.status(500).send('Internal Server Error');
  }
});
router.post("/admin/add-new-faq", requireSuperLogin, async (req, res) => {
  try {
      const { question, answer } = req.body;
      const newFAQ = new Faq({
        question: question,
        answer: answer,
      });
      await newFAQ.save();
      res.locals.activePage = 'admin/faq'; 
      return res.redirect('/admin/faq');
  } catch (error) {
      console.error("Error:", error);
      req.session.error = "An error occurred. Please contact us!";
      return res.redirect('/admin/faq'); 
  }
});
router.get('/admin/edit-faq/:faqID', requireSuperLogin, async (req, res) => {
  try {
    const faqID = req.params.faqID;
    const faq = await Faq.findOne({ _id: faqID });
    const businessID = req.session.businessID;
    const business = await Business.findOne({ _id: businessID });
    const businessStatus = 'Waiting';
    const applications = await Application.find({ businessStatus: businessStatus });
    if (!faq) {
      return res.status(404).send('FAQ not found');
    }
    res.locals.req = req;
    res.locals.activePage = 'admin/faq';
    res.render('admin/edit-faq', { faq, business, applications });
  } catch (err) {
    console.error(err);
    res.status(500).send('Internal Server Error');
  }
});
router.post('/admin/edit-faq/:faqID', requireSuperLogin, async (req, res) => {
  try {
      const faqID = req.params.faqID;
      const { question, answer } = req.body;
      const faq = await Faq.findById(faqID);

      if (!faq) {
          req.session.error = 'Category not found';
          return res.redirect('/admin/faq');
      }
      faq.question = question;
      faq.answer = answer;
      await faq.save();

      res.locals.activePage = 'admin/faq';
      return res.redirect('/admin/faq');
  } catch (error) {
      console.error('Error:', error);
      req.session.error = 'An error occurred. Please contact us!';
      return res.redirect('/admin/faq');
  }
});
router.get('/admin/delete-faq/:faqID', async (req, res) => {
  try {
    const faqID = req.params.faqID;
    await Faq.findByIdAndRemove(faqID);

    res.locals.req = req;
    res.locals.activePage = 'admin/faq'; 
    return res.redirect('/admin/faq');
  } catch (error) {
    console.error("Error:", error);
    req.session.error = "An error occurred. Please contact us!";
    return res.redirect('/admin/faq'); 
  }
});
//ABOUT
router.get('/admin/about', requireSuperLogin,  async (req, res) => {
  try {
    const aboutId = '6722264b1577e7ce978858f8';
    const about = await About.findById(aboutId);

    const businessID = req.session.businessID;
    const business = await Business.findOne({ _id: businessID });
    const businessStatus = 'Waiting';
    const applications = await Application.find({ businessStatus: businessStatus });
    if (!about) {
      return res.status(200).send('No About data available.');
    }

    res.locals.req = req;
    res.locals.activePage = 'admin/about';
    res.render('admin/about', { about, business,applications });
  } catch (err) {
    console.error(err);
    res.status(500).send('Internal Server Error');
  }
});
router.post('/admin/edit-about/:aboutID', requireSuperLogin, upload.single('aboutImage'), async (req, res) => {
  try {
      const aboutID = req.params.aboutID;
      const about = await About.findOne({ _id: aboutID });
      const { heading, maintext } = req.body;
    
      const aboutImage = req.file ? 'http://localhost:3001/assets/images/business/' + req.file.filename : about.aboutImage;

      about.aboutImage = aboutImage;
      about.heading = heading;
      about.maintext = maintext;
      await about.save();

      res.locals.req = req;
      res.locals.activePage = 'admin/about';
      return res.redirect('/admin/about');
  } catch (error) {
      console.error('Error:', error);
      req.session.error = 'An error occurred. Please contact us!';
      return res.redirect('/admin/about');
  }
});

//HOW IT WORK
router.get('/admin/process', requireSuperLogin,  async (req, res) => {
  try {
    const processID = '6524e5338b4a751a4d3f3741';
    const process = await Process.findById(processID);
    const businessID = req.session.businessID;
    const business = await Business.findOne({ _id: businessID });
    const businessStatus = 'Waiting';
    const applications = await Application.find({ businessStatus: businessStatus });
    if (!process) {
      return res.status(200).send('No data available.');
    }
    res.locals.req = req;
    res.locals.activePage = 'admin/process';
    res.render('admin/process', { process, business,applications });
  } catch (err) {
    console.error(err);
    res.status(500).send('Internal Server Error');
  }
});
router.post('/admin/edit-process/:processID', requireSuperLogin, async (req, res) => {
  try {
    const processID = req.params.processID;
    const process = await Process.findOne({ _id: processID });
    const { heading, maintext, stepTitle, stepDescription } = req.body;

    const titles = Array.isArray(stepTitle) ? stepTitle : [stepTitle];
    const descriptions = Array.isArray(stepDescription) ? stepDescription : [stepDescription];
    for (let i = 0; i < titles.length; i++) {
      if (!process.steps[i]) {
        process.steps.push({ title: titles[i], description: descriptions[i] });
      } else {
        process.steps[i].title = titles[i];
        process.steps[i].description = descriptions[i];
      }
    }
    process.heading = heading;
    process.maintext = maintext;

    await process.save();

    res.locals.req = req;
    res.locals.activePage = 'admin/process';
    return res.redirect('/admin/process');
  } catch (error) {
    console.error('Error:', error);
    req.session.error = 'An error occurred. Please contact us!';
    return res.redirect('/admin/process');
  }
});
//AGB
router.get('/admin/agb', requireSuperLogin, async (req, res) => {
  try {
    const agbID = '66d5a729a0a1739842063915';
    const agb = await Agb.findById(agbID);
    const businessStatus = 'Waiting';
    const applications = await Application.find({ businessStatus: businessStatus });
    const businessID = req.session.businessID;
    const business = await Business.findOne({ _id: businessID });

    if (!agb) {
      return res.status(200).send('No AGB data available.');
    }
    res.locals.req = req;
    res.locals.activePage = 'admin/agb';
    res.render('admin/agb', { agb, applications, business });
  } catch (err) {
    console.error(err);
    res.status(500).send('Internal Server Error');
  }
});
router.post('/admin/edit-agb/:agbID', requireSuperLogin, async (req, res) => {
  try {
      const agbID = req.params.agbID;
      const agb = await Agb.findOne({ _id: agbID });
      const { heading, text } = req.body;

      agb.heading = heading;
      agb.text = text;
      await agb.save();

      res.locals.req = req;
      res.locals.activePage = 'admin/agb';
      return res.redirect('/admin/agb');
  } catch (error) {
      console.error('Error:', error);
      req.session.error = 'An error occurred. Please contact us!';
      return res.redirect('/admin/agb');
  }
});
//IMPRESSUM
router.get('/admin/impressum', requireSuperLogin, async (req, res) => {
  try {
    const impressumID = '6722291b1577e7ce978858fb';
    const impressum = await Impressum.findById(impressumID);

    const businessID = req.session.businessID;
    const business = await Business.findOne({ _id: businessID });
    const businessStatus = 'Waiting';
    const applications = await Application.find({ businessStatus: businessStatus });
    if (!impressum) {
      return res.status(200).send('No Impressum data available.');
    }
    res.locals.req = req;
    res.locals.activePage = 'admin/impressum';
    res.render('admin/impressum', { impressum, business, applications });
  } catch (err) {
    console.error(err);
    res.status(500).send('Internal Server Error');
  }
});
router.post('/admin/edit-impressum/:impressumID', requireSuperLogin, async (req, res) => {
  try {
      const impressumID = req.params.impressumID;
      const impressum = await Impressum.findOne({ _id: impressumID });
      const { heading, text } = req.body;

      impressum.heading = heading;
      impressum.text = text;
      await impressum.save();
    
      res.locals.activePage = 'admin/impressum';
      return res.redirect('/admin/impressum');
  } catch (error) {
      console.error('Error:', error);
      req.session.error = 'An error occurred. Please contact us!';
      return res.redirect('/admin/impressum');
  }
});
//COUPON CODE
router.get('/admin/promotion', requireSuperLogin, async (req, res) => {
  try {
    const promotions = await Promotion.find();
    const business = await Business.find();

    if (promotions.length === 0) {
      res.locals.req = req;
      res.locals.activePage = 'admin/promotion';
      res.render('admin/promotions', { promotions: null, business });
    } else {
      res.locals.req = req;
      res.locals.activePage = 'admin/promotion';
      res.render('admin/promotions', { promotions, business });
    }
  } catch (err) {
    console.error(err);
    res.status(500).send('Error: ' + err.message);
  }
});
router.get('/admin/add-coupon', requireSuperLogin, async (req, res) => {
  try {
    const promotions = await Promotion.find();
    const business = await Business.find();

    if (promotions.length === 0) {
      res.locals.req = req;
      res.locals.activePage = 'admin/promotion';
      res.render('admin/add-coupon', {  promotions: null, business });
    } else {
      res.locals.req = req;
      res.locals.activePage = 'admin/promotion';
      res.render('admin/add-coupon', {  promotions, business });
    }
  } catch (err) {
    console.error(err);
    res.status(500).send('Error: ' + err.message);
  }
});
router.post("/admin/add-new-coupon", requireSuperLogin, async (req, res) => {
  try {
      const { couponCode, couponType, couponStatus, couponValue, minValue} = req.body;
      const newCoupon = new Promotion({
        couponCode: couponCode,
        couponType: couponType,
        couponStatus: couponStatus,
        couponValue: couponValue,
        minValue: minValue,
      });
      await newCoupon.save();
      res.locals.activePage = 'admin/promotion'; 
      return res.redirect('/admin/promotion');
  } catch (error) {
      console.error("Error:", error);
      req.session.error = "An error occurred. Please contact us!";
      return res.redirect('/admin/promotion'); 
  }
});
router.get('/admin/edit-coupon/:couponID', requireSuperLogin, async (req, res) => {
    try {
      const couponID = req.params.couponID;
      const promotions = await Promotion.findOne({ _id: couponID });
      const business = await Business.find();
      if (!promotions) {
        return res.status(404).send('Coupon code not found');
      }
      res.locals.req = req;
      res.locals.activePage = 'admin/promotion';
      res.render('admin/edit-coupon', { promotions, business });
    } catch (err) {
      console.error(err);
      res.status(500).send('Internal Server Error');
    }
});
router.get('/admin/delete-coupon/:couponID', async (req, res) => {
  try {
    const couponID = req.params.couponID;
    await Promotion.findByIdAndRemove(couponID);

    res.locals.req = req;
    res.locals.activePage = 'admin/promotion'; 
    return res.redirect('/admin/promotion');
  } catch (error) {
    console.error("Error:", error);
    req.session.error = "An error occurred. Please contact us!";
    return res.redirect('/admin/promotion'); 
  }
});
router.post('/admin/edit-coupon/:couponID', requireSuperLogin, async (req, res) => {
    try {
        const couponID = req.params.couponID;
        const { couponCode, couponType, couponStatus, couponValue, minValue } = req.body;
        const promotions = await Promotion.findById(couponID);

        if (!promotions) {
            req.session.error = 'Coupon Code not found';
            return res.redirect('/admin/promotion');
        }
        promotions.couponCode = couponCode;
        promotions.couponType = couponType;
        promotions.couponStatus = couponStatus;
        promotions.couponValue = couponValue;
        promotions.minValue = minValue;
        await promotions.save();

        res.locals.activePage = 'admin/promotion';
        return res.redirect('/admin/promotion');
    } catch (error) {
        console.error('Error:', error);
        req.session.error = 'An error occurred. Please contact us!';
        return res.redirect('/admin/promotion');
    }
});
//CAMPAIGNS
router.get('/admin/campaigns', requireSuperLogin, async (req, res) => {
  try {
    const businessID = '673bda0ff018e034f5a43e9c';
    const campaigns = await Campaign.find({ businessID: businessID });
    const business = await Business.findOne({ _id: businessID });

    if (campaigns.length === 0) {
      res.locals.req = req;
      res.locals.activePage = 'admin/campaigns';
      return res.render('admin/campaigns', { campaigns: null, business });
    }

    for (let i = 0; i < campaigns.length; i++) {
      const campaign = campaigns[i];
      if (campaign.campaignDetails && campaign.campaignDetails.length > 0) {
        for (let j = 0; j < campaign.campaignDetails.length; j++) {
          const detail = campaign.campaignDetails[j];
          try {
            let campaignItem;
            if (campaign.campaignType === 'Service') {
              campaignItem = await Service.findById(detail.serviceID);
              detail.serviceName = campaignItem.serviceName;
            } else if (campaign.campaignType === 'Product') {
              campaignItem = await Product.findById(detail.productID);
              detail.serviceName = campaignItem.productName;
            }
          } catch (error) {
            console.error('Error fetching campaign item:', error);
            detail.campaignItemName = 'Unknown Item';
          }
        }
      }
    }

    res.locals.req = req;
    res.locals.activePage = 'admin/campaigns';
    return res.render('admin/campaigns', { campaigns, business });
  } catch (err) {
    console.error(err);
    res.status(500).send('Error: ' + err.message);
  }
});
router.get('/admin/add-campaign', requireSuperLogin, async (req, res) => {
  try {
    const businessID = req.session.businessID;
    const campaigns = await Campaign.find({ businessID: businessID });
    const business = await Business.findOne({ _id: businessID });
    const services = await Service.find({ businessID: businessID });

    if (campaigns.length === 0) {
      res.locals.req = req;
      res.locals.activePage = 'admin/campaigns';
      res.render('admin/add-campaign', {  campaigns: null, business, services });
    } else {
      res.locals.req = req;
      res.locals.activePage = 'admin/campaigns';
      res.render('admin/add-campaign', {  campaigns, business, services });
    }
  } catch (err) {
    console.error(err);
    res.status(500).send('Error: ' + err.message);
  }
});
router.get('/admin/add-product-campaign', requireSuperLogin, async (req, res) => {
  try {
    const businessID = '673bda0ff018e034f5a43e9c';
    const campaigns = await Campaign.find({ businessID: businessID });
    const business = await Business.findOne({ _id: businessID });
    const products = await Product.find({ businessID: businessID });

    if (campaigns.length === 0) {
      res.locals.req = req;
      res.locals.activePage = 'admin/campaigns';
      res.render('admin/add-product-campaign', {  campaigns: null, business, products });
    } else {
      res.locals.req = req;
      res.locals.activePage = 'admin/campaigns';
      res.render('admin/add-product-campaign', {  campaigns, business, products });
    }
  } catch (err) {
    console.error(err);
    res.status(500).send('Error: ' + err.message);
  }
});
router.post("/admin/add-new-campaign", requireSuperLogin, uploadproduct.single('campaignImage'), async (req, res) => {
  try {
    const businessID = req.session.businessID;
    const campaignImage = req.file ? 'http://localhost:3001/assets/images/business/' + req.file.filename : null;
    const { campaignStartDate, campaignEndDate, campaignDesciption, campaignName, serviceID, currentPrice, campaignPrice, campaignType,campaignText } = req.body;
    const campaignDetails = [];
    for (let i = 0; i < serviceID.length; i++) {
      const splitServiceID = serviceID[i].split('+');
      const newServiceID = splitServiceID[0];
      campaignDetails.push({
        serviceID: newServiceID,
        currentPrice: currentPrice[i],
        campaignPrice: campaignPrice[i],
      });
    }

    const newCampaign = new Campaign({
      campaignStartDate: campaignStartDate,
      campaignEndDate: campaignEndDate,
      campaignDesciption: campaignDesciption,
      campaignName: campaignName,
      campaignText: campaignText,
      campaignImage: campaignImage,
      businessID: businessID,
      campaignDetails: campaignDetails,
      campaignType: campaignType,
    });

    await newCampaign.save();
    
    res.locals.activePage = 'admin/campaigns'; 
    return res.redirect('/admin/campaigns');
  } catch (error) {
    console.error("Error:", error);
    req.session.error = "An error occurred. Please contact us!";
    return res.redirect('/admin/campaigns'); 
  }
});
router.post("/admin/add-new-product-campaign", requireSuperLogin, uploadproduct.single('campaignImage'), async (req, res) => {
  try {
    const businessID = req.session.businessID;
    const campaignImage = req.file ? 'http://localhost:3001/assets/images/business/' + req.file.filename : null;
    const { campaignStartDate, campaignEndDate, campaignDesciption, campaignName, productID, currentPrice, campaignPrice, campaignType,campaignText } = req.body;
    const campaignDetails = [];
    for (let i = 0; i < productID.length; i++) {
      const splitProductID = productID[i].split('+');
      const newProductID = splitProductID[0];

      campaignDetails.push({
        productID: newProductID,
        currentPrice: currentPrice[i],
        campaignPrice: campaignPrice[i],
      });
    }

    const newCampaign = new Campaign({
      campaignStartDate: campaignStartDate,
      campaignEndDate: campaignEndDate,
      campaignDesciption: campaignDesciption,
      campaignName: campaignName,
      campaignText: campaignText,
      campaignImage: campaignImage,
      businessID: businessID,
      campaignDetails: campaignDetails,
      campaignType: campaignType,
    });

    await newCampaign.save();
    
    res.locals.activePage = 'admin/campaigns'; 
    return res.redirect('/admin/campaigns');
  } catch (error) {
    console.error("Error:", error);
    req.session.error = "An error occurred. Please contact us!";
    return res.redirect('/admin/campaigns'); 
  }
});
router.get('/admin/edit-campaign/:campaignID', requireSuperLogin, async (req, res) => {
    try {
      const campaignID = req.params.campaignID;
      const campaigns = await Campaign.findOne({ _id: campaignID });
      const businessID = '673bda0ff018e034f5a43e9c';
      const business = await Business.findOne({ _id: businessID });
      const services = await Service.find({ businessID: businessID });
      const products = await Product.find({ businessID: businessID });

      if (!campaigns) {
        return res.status(404).send('Coupon code not found');
      }
      res.locals.req = req;
      res.locals.activePage = 'admin/campaigns';
      res.render('admin/edit-campaign', { campaigns, business,services, products });
    } catch (err) {
      console.error(err);
      res.status(500).send('Internal Server Error');
    }
});
router.get('/admin/delete-campaign/:campaignID', async (req, res) => {
  try {
    const campaignID = req.params.campaignID;
    await Campaign.findByIdAndRemove(campaignID);

    res.locals.req = req;
    res.locals.activePage = 'admin/campaigns'; 
    return res.redirect('/admin/campaigns');
  } catch (error) {
    console.error("Error:", error);
    req.session.error = "An error occurred. Please contact us!";
    return res.redirect('/admin/campaigns'); 
  }
});
router.post('/admin/edit-campaign/:campaignID', requireSuperLogin, uploadproduct.single('campaignImage'), async (req, res) => {
  try {
      const campaignID = req.params.campaignID;
      const { campaignStartDate, campaignEndDate, campaignRatio, campaignDesciption, campaignName, campaignType,serviceID, productID, currentPrice, campaignPrice,campaignText } = req.body;
      const campaign = await Campaign.findById(campaignID);
      const campaignImage = req.file ? 'http://localhost:3001/assets/images/business/' + req.file.filename : campaign.campaignImage;
      if (!campaign) {
          req.session.error = 'Campaign not found';
          return res.redirect('/admin/campaigns');
      }
      campaign.campaignStartDate = campaignStartDate;
      campaign.campaignEndDate = campaignEndDate;
      campaign.campaignRatio = campaignRatio;
      campaign.campaignDesciption = campaignDesciption;
      campaign.campaignName = campaignName;
      campaign.campaignText = campaignText;
      campaign.campaignImage = campaignImage;
      campaign.campaignType = campaignType;

      if (campaignType == 'Product') {
        campaign.campaignDetails = [];
        for (let i = 0; i < productID.length; i++) {
            const splitProductID = productID[i].split('+');
            const newProductID = splitProductID[0];

            campaign.campaignDetails.push({
                productID: newProductID,
                currentPrice: currentPrice[i],
                campaignPrice: campaignPrice[i],
            });
        }
      } else {
        campaign.campaignDetails = [];
        for (let i = 0; i < serviceID.length; i++) {
            const splitProductID = serviceID[i].split('+');
            const newProductID = splitProductID[0];

            campaign.campaignDetails.push({
                serviceID: newProductID,
                currentPrice: currentPrice[i],
                campaignPrice: campaignPrice[i],
            });
        }
      }
      

      await campaign.save();

      res.locals.activePage = 'admin/campaigns';
      return res.redirect('/admin/campaigns');
  } catch (error) {
      console.error('Error:', error);
      req.session.error = 'An error occurred. Please contact us!';
      return res.redirect('/admin/campaigns');
  }
});
//ORDERS
router.get('/admin/orders', requireSuperLogin, async (req, res) => {
  try {
	const paymentStatus="Success";
    const businessID = req.session.businessID;
    const orders = await Orders.find({ businessID: businessID, paymentStatus:paymentStatus });
    const business = await Business.findOne({ _id: businessID });
    const auth=1;
    const businessCommision = await Business.findOne({ auth: auth });
    if (orders.length === 0) {
      res.locals.req = req;
      res.locals.activePage = 'admin/orders';
      res.render('admin/orders', { orders: null, business, businessCommision  });
    } else {
      const ordersWithSchedule = await Promise.all(orders.map(async (order) => {
        const schedule = await ScheduleModel.findOne({ orderNumber: order.orderNumber, paymentStatus:paymentStatus });
        if (schedule) {
            return {
                ...order._doc,
                startDate: schedule.startDate || null,
            };
        } else {
            return {
                ...order._doc,
                startDate: null,
            };
        }
    }));

      res.locals.req = req;
      res.locals.activePage = 'admin/orders';
      res.render('admin/orders', { orders: ordersWithSchedule, business, businessCommision });
    }
  } catch (err) {
    console.error(err);
    res.status(500).send('Error: ' + err.message);
  }
});
router.get('/admin/earning-reports', requireSuperLogin, async (req, res) => {
  try {
    const businessID = req.session.businessID;
    const business = await Business.findOne({ _id: businessID });
    res.locals.req = req;
    res.locals.activePage = 'admin/earning-reports';
    res.render('admin/earning-reports', { business });
  } catch (err) {
    console.error(err);
    res.status(500).send('Internal Server Error');
  }
});
router.get('/admin/admin-orders', requireSuperLogin, async (req, res) => {
  try {
    const paymentStatus="Success";
    const orders = await Orders.find({paymentStatus:paymentStatus}).sort({ createdAt: -1 });
    const businessID = req.session.businessID;
    const business = await Business.findOne({ _id: businessID });
    const businessStatus = 'Waiting';
    const applications = await Application.find({ businessStatus: businessStatus });
    if (orders.length === 0) {
      res.locals.req = req;
      res.locals.activePage = 'admin/admin-orders';
      res.render('admin/admin-orders', { orders: null, business, applications });
    } else {
      const ordersWithSchedule = await Promise.all(orders.map(async (order) => {
        const schedule = await ScheduleModel.findOne({ orderNumber: order.orderNumber,paymentStatus:paymentStatus });
        if (schedule) {
            return {
                ...order._doc,
                startDate: schedule.startDate || null,
            };
        } else {
            return {
                ...order._doc,
                startDate: null,
            };
        }
    }));
      res.locals.req = req;
      res.locals.activePage = 'admin/admin-orders';
      res.render('admin/admin-orders', { orders: ordersWithSchedule, business, applications });
    }
  } catch (err) {
    console.error(err);
    res.status(500).send('Error: ' + err.message);
  }
});
router.get('/admin/admin-earning-reports', requireSuperLogin, async (req, res) => {
  try {
    const businessID = req.session.businessID;
    const business = await Business.findOne({ _id: businessID });
    const businessStatus = 'Waiting';
    const applications = await Application.find({ businessStatus: businessStatus });
    res.locals.req = req;
    res.locals.activePage = 'admin/admin-earning-reports';
    res.render('admin/admin-earning-reports', { business, applications });
  } catch (err) {
    console.error(err);
    res.status(500).send('Internal Server Error');
  }
});
router.post('/admin/admin-orders', async (req, res) => {
  try {
    const startDate = req.body.startDate;
    const endDate = req.body.endDate;
    const businessID = req.session.businessID;
    const business = await Business.findOne({ _id: businessID });
    const businessStatus = 'Waiting';
    const applications = await Application.find({ businessStatus: businessStatus });
    let orders;

    if (startDate && endDate) {
      orders = await Orders.find({
        createdAt: {
          $gte: new Date(startDate),
          $lte: new Date(endDate),
        },
      }).sort({ createdAt: -1 });
    } else {
      orders = await Orders.find().sort({ createdAt: -1 });
    }
    
    res.locals.req = req;
    res.locals.activePage = 'admin/admin-orders';
    res.render('admin/admin-orders', { orders, business, applications });
  
  } catch (err) {
    console.error('Error searching for orders:', err);
    res.status(500).send('Internal Server Error');
  }
});
//TAX
router.get('/admin/tax-rates', requireSuperLogin, async (req, res) => {
  try {
    const mwst = await Mwst.find();
    const businessID = req.session.businessID;
    const business = await Business.findOne({ _id: businessID });
    const businessStatus = 'Waiting';
    const applications = await Application.find({ businessStatus: businessStatus });

    if (mwst.length === 0) {
      res.locals.req = req;
      res.locals.activePage = 'admin/tax-rates';
      res.render('admin/tax-rates', {  mwst: null, business, applications });
    } else {
      res.locals.req = req;
      res.locals.activePage = 'admin/tax-rates';
      res.render('admin/tax-rates', {  mwst, business, applications});
    }
  } catch (err) {
    console.error(err);
    res.status(500).send('Error: ' + err.message);
  }
});
router.get('/admin/add-tax', requireSuperLogin, async (req, res) => {
  try {
    const businessID = req.session.businessID;
    const business = await Business.findOne({ _id: businessID });
    const businessStatus = 'Waiting';
    const applications = await Application.find({ businessStatus: businessStatus });
    res.locals.req = req;
    res.locals.activePage = 'admin/tax-rates';
    res.render('admin/add-tax', { business, applications });
  } catch (err) {
    console.error(err);
    res.status(500).send('Internal Server Error');
  }
});
router.post("/admin/add-new-mwst", requireSuperLogin, async (req, res) => {
  try {
      const { mwstName,mwstRatio } = req.body;
      const newMwst = new Mwst({
        mwstName: mwstName,
        mwstRatio: mwstRatio,
      });
      await newMwst.save();
      res.locals.activePage = 'admin/tax-rates'; 
      return res.redirect('/admin/tax-rates');
  } catch (error) {
      console.error("Error:", error);
      req.session.error = "An error occurred. Please contact us!";
      return res.redirect('/admin/tax-rates'); 
  }
});
router.get('/admin/edit-tax/:mwstID', requireSuperLogin, async (req, res) => {
    try {
      const mwstID = req.params.mwstID;
      const mwst = await Mwst.findOne({ _id: mwstID });
      const businessID = req.session.businessID;
      const business = await Business.findOne({ _id: businessID });
      const businessStatus = 'Waiting';
      const applications = await Application.find({ businessStatus: businessStatus });
  
      if (!mwst) {
        return res.status(404).send('Mwst not found');
      }
      res.locals.req = req;
      res.locals.activePage = 'admin/tax-rates';
      res.render('admin/edit-tax', { mwst, business, applications });
    } catch (err) {
      console.error(err);
      res.status(500).send('Internal Server Error');
    }
});
router.get('/admin/delete-mwst/:mwstID', async (req, res) => {
  try {
    const mwstID = req.params.mwstID;
    await Mwst.findByIdAndRemove(mwstID);
    res.locals.req = req;
    res.locals.activePage = 'admin/tax-rates'; 
    return res.redirect('/admin/tax-rates');
  } catch (error) {
    console.error("Error:", error);
    req.session.error = "An error occurred. Please contact us!";
    return res.redirect('/admin/tax-rates'); 
  }
});
router.post('/admin/edit-mwst/:mwstID', requireSuperLogin, async (req, res) => {
    try {
        const mwstID = req.params.mwstID;
        const { mwstName, mwstRatio } = req.body;
        const MWST = await Mwst.findById(mwstID);

        if (!MWST) {
            req.session.error = 'Mwst not found';
            return res.redirect('/admin/tax-rates');
        }
        MWST.mwstName = mwstName;
        MWST.mwstRatio = mwstRatio;
        await MWST.save();

        res.locals.activePage = 'admin/tax-rates';
        return res.redirect('/admin/tax-rates');
    } catch (error) {
        console.error('Error:', error);
        req.session.error = 'An error occurred. Please contact us!';
        return res.redirect('/admin/tax-rates');
    }
});
//IMAGES
router.get('/admin/saloon-images', requireSuperLogin, async (req, res) => {
  try {
    const businessID = req.session.businessID;
    const business = await Business.findOne({_id:businessID});

    if (!business) {
      return res.status(200).send('No data available.');
    }
    res.locals.req = req;
    res.locals.activePage = 'admin/saloon-images';
    res.render('admin/saloon-images', { business });
  } catch (err) {
    console.error(err);
    res.status(500).send('Internal Server Error');
  }
});
router.post('/admin/delete-images', async (req, res) => {
  try {
      const businessID = req.session.businessID;
      const { selectedImages } = req.body;
      const business = await Business.findOne({ _id:businessID });

      if (!business) {
          return res.status(404).send('Business not found.');
      }

      business.businessImages = business.businessImages.filter(image => !selectedImages.includes(image));
      await business.save();

      res.status(200).send('Selected images deleted successfully.');
  } catch (err) {
      console.error(err);
      res.status(500).send('Internal Server Error');
  }
});
router.post('/admin/upload-images', uploadSaloon, async (req, res) => {
  try {
    const baseImageUrl = 'http://localhost:3001/assets/images/business/';
    const businessID = req.session.businessID;
    const business = await Business.findOne({ _id: businessID });

    if (!business) {
      return res.status(404).send('Business not found.');
    }

    let newImages;
    if (req.files) {
      newImages = req.files.map(file => baseImageUrl + file.filename);
    } else if (req.file) {
      newImages = [baseImageUrl + req.file.filename];
    } else {
      console.log('No files uploaded.');
      return res.status(400).json({ error: 'No files uploaded.' });
    }

    business.businessImages = business.businessImages.concat(newImages);
    await business.save();

    res.status(200).json({ message: 'Images uploaded successfully.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});
router.get('/admin/404', async (req, res) => {
  try {
      res.render('admin/404');
  } catch (err) {
      console.error(err);
      res.status(500).send('Internal Server Error');
  }
});
//SLIDES
router.get('/admin/slides', requireSuperLogin, async (req, res) => {
  try {
    const businessID = req.session.businessID;
    const businessStatus = 'Waiting';
    const applications = await Application.find({businessStatus:businessStatus});
    const allapplications = await Application.find();
    const slides = await Slide.find();
    const business = await Business.findOne({ _id: businessID });
    if (slides.length === 0) {
      res.locals.req = req;
      res.locals.activePage = 'admin/slides';
      res.render('admin/slides', { slides: null, business, applications, allapplications });
    } else {
      res.locals.req = req;
      res.locals.activePage = 'admin/slides';
      res.render('admin/slides', { slides, applications, business, allapplications });
    }
  } catch (err) {
    console.error(err);
    res.status(500).send('Error: ' + err.message);
  }
});
router.get('/admin/add-slide', requireSuperLogin, async (req, res) => {
  try {
    const businessID = req.session.businessID;
    const business = await Business.findOne({ _id: businessID });
    const businessStatus = 'Waiting';
    const applications = await Application.find({businessStatus:businessStatus});
    const allapplications = await Application.find();
    res.locals.req = req;
    res.locals.activePage = 'admin/add-slide';
    res.render('admin/add-slide', {  business,applications, allapplications });
  } catch (err) {
    console.error(err);
    res.status(500).send('Error: ' + err.message);
  }
});
router.post("/admin/add-new-slide", requireSuperLogin, uploadproduct.single('slideImage'), async (req, res) => {
  try {
    const slideImage = req.file ? 'http://localhost:3001/assets/images/business/' + req.file.filename : null;
	  const { slideBig, slideSmall } = req.body;
    const newSlide = new Slide({
      image_path: slideImage,
		slideBig:slideBig,
		slideSmall:slideSmall
    });
    await newSlide.save();
    res.locals.activePage = 'admin/slides';
    return res.redirect('/admin/slides');
  } catch (error) {
    console.error("Error:", error);
    req.session.error = "An error occurred. Please contact us!";
    return res.redirect('/admin/slides');
  }
});
router.get('/admin/delete-slide/:slideID', async (req, res) => {
  try {
    const slideID = req.params.slideID;
    await Slide.findByIdAndRemove(slideID);
    res.locals.req = req;
    res.locals.activePage = 'admin/slides'; 
    return res.redirect('/admin/slides');
  } catch (error) {
    console.error("Error:", error);
    req.session.error = "An error occurred. Please contact us!";
    return res.redirect('/admin/slides'); 
  }
});
//SLIDE WEB
router.get('/admin/slides-web', requireSuperLogin,  async (req, res) => {
  try {
    const slideID = '65b39551ac83df43234f0b76';
    const slide = await SlideWeb.findById(slideID);

    const businessID = req.session.businessID;
    const business = await Business.findOne({ _id: businessID });
    const businessStatus = 'Waiting';
    const applications = await Application.find({ businessStatus: businessStatus });
    if (!slide) {
      return res.status(200).send('No About data available.');
    }

    res.locals.req = req;
    res.locals.activePage = 'admin/slides-web';
    res.render('admin/slides-web', { slide, business,applications });
  } catch (err) {
    console.error(err);
    res.status(500).send('Internal Server Error');
  }
});
router.post('/admin/edit-slide-web/:slideID', requireSuperLogin, upload.single('slideImageWeb'), async (req, res) => {
  try {
      const slideID = req.params.slideID;
      const slide = await SlideWeb.findOne({ _id: slideID });
      const { slideBig, slideSmall } = req.body;
    
      const slideImageWeb = req.file ? 'http://localhost:3001/assets/images/business/' + req.file.filename : slide.slideImageWeb;

      slide.slideImageWeb = slideImageWeb;
      slide.slideBig = slideBig;
      slide.slideSmall = slideSmall;
      await slide.save();

      res.locals.req = req;
      res.locals.activePage = 'admin/slides-web';
      return res.redirect('/admin/slides-web');
  } catch (error) {
      console.error('Error:', error);
      req.session.error = 'An error occurred. Please contact us!';
      return res.redirect('/admin/slides-web');
  }
});
router.post('/admin/edit-slide-app/:slideID', requireSuperLogin, upload.single('slideImage'), async (req, res) => {
  try {
      const slideID = req.params.slideID;
      const slide = await Slide.findOne({ _id: slideID });
      const { slideBig, slideSmall } = req.body;
    
      const slideImage = req.file ? 'http://localhost:3001/assets/images/business/' + req.file.filename : slide.image_path;

      slide.image_path = slideImage;
      slide.slideBig = slideBig;
      slide.slideSmall = slideSmall;
      await slide.save();

      res.locals.req = req;
      res.locals.activePage = 'admin/slides';
      return res.redirect('/admin/slides');
  } catch (error) {
      console.error('Error:', error);
      req.session.error = 'An error occurred. Please contact us!';
      return res.redirect('/admin/slides');
  }
});
router.get('/admin/edit-slide/:slideID', requireSuperLogin, async (req, res) => {
  try {
    const businessID = req.session.businessID;
    const slideID = req.params.slideID;	  
    const business = await Business.findOne({ _id: businessID });
    const slide = await Slide.findOne({ _id: slideID });	  
    const businessStatus = 'Waiting';
    const applications = await Application.find({businessStatus:businessStatus});
    const allapplications = await Application.find();
    res.locals.req = req;
    res.locals.activePage = 'admin/slides';
    res.render('admin/edit-slide', {  business,applications, allapplications, slide });
  } catch (err) {
    console.error(err);
    res.status(500).send('Error: ' + err.message);
  }
});
//REVIEWS
router.get('/admin/reviews', requireSuperLogin, async (req, res) => {
  try {
    const reviews = await Reviews.find();
    if (reviews.length === 0) {
      res.locals.req = req;
      res.locals.activePage = 'admin/reviews';
      res.render('admin/reviews', {  reviews: null });
    } else {
      res.locals.req = req;
      res.locals.activePage = 'admin/reviews';
      res.render('admin/reviews', {  reviews });
    }
  } catch (err) {
    console.error(err);
    res.status(500).send('Error: ' + err.message);
  }
});
router.get('/admin/add-review', requireSuperLogin, async (req, res) => {
  try {
    const reviews = await Reviews.find();
    if (reviews.length === 0) {
      res.locals.req = req;
      res.locals.activePage = 'admin/reviews';
      res.render('admin/add-review', {  reviews: null });
    } else {
      res.locals.req = req;
      res.locals.activePage = 'admin/reviews';
      res.render('admin/add-review', {  reviews });
    }
  } catch (err) {
    console.error(err);
    res.status(500).send('Error: ' + err.message);
  }
});
router.post("/admin/add-new-review", requireSuperLogin, async (req, res) => {
  try {
      const { reviewDetails,reviewOwner,reviewPoint,reviewHeading } = req.body;
      const newReview = new Reviews({reviewDetails: reviewDetails,reviewOwner:reviewOwner,reviewPoint:reviewPoint,reviewHeading:reviewHeading});
      await newReview.save();
      res.locals.activePage = 'admin/reviews'; 
      return res.redirect('/admin/reviews');
  } catch (error) {
      console.error("Error:", error);
      req.session.error = "An error occurred. Please contact us!";
      return res.redirect('/admin/reviews'); 
  }
});
router.get('/admin/edit-review/:reviewID', requireSuperLogin, async (req, res) => {
  try {
    const reviewID = req.params.reviewID;
    const review = await Reviews.findOne({ _id: reviewID });
    if (!review) {
      return res.status(404).send('Review not found');
    }
    res.locals.req = req;
    res.locals.activePage = 'admin/reviews';
    res.render('admin/edit-review', { review });
  } catch (err) {
    console.error(err);
    res.status(500).send('Internal Server Error');
  }
});
router.post('/admin/edit-review/:reviewID', requireSuperLogin, async (req, res) => {
  try {
      const reviewID = req.params.reviewID;
      const { reviewPoint,reviewHeading,reviewOwner,reviewDetails } = req.body;
      const review = await Reviews.findById(reviewID);

      if (!review) {
          req.session.error = 'Review not found';
          return res.redirect('/admin/reviews');
      }
      review.reviewPoint = reviewPoint;	
      review.reviewHeading = reviewHeading;	
      review.reviewOwner = reviewOwner;	
      review.reviewDetails = reviewDetails;	
      await review.save();
      res.locals.activePage = 'admin/reviews';
      return res.redirect('/admin/reviews');
  } catch (error) {
      console.error('Error:', error);
      req.session.error = 'An error occurred. Please contact us!';
      return res.redirect('/admin/reviews');
  }
});
router.get('/admin/delete-review/:reviewID', async (req, res) => {
  try {
    const reviewID = req.params.reviewID;
    await Reviews.findByIdAndRemove(reviewID);

    res.locals.req = req;
    res.locals.activePage = 'admin/reviews'; 
    return res.redirect('/admin/reviews');
  } catch (error) {
    console.error("Error:", error);
    req.session.error = "An error occurred. Please contact us!";
    return res.redirect('/admin/reviews'); 
  }
});
//customers
router.get('/admin/customers', requireSuperLogin, async (req, res) => {
  try {
    const business = await Business.find();
    const users = await User.find();

    res.locals.req = req;
    res.locals.activePage = 'admin/customers';
    res.render('admin/customers', { users , business });
  } catch (err) {
    console.error(err);
    res.status(500).send('Error: ' + err.message);
  }
});
router.get('/admin/add-customer', requireSuperLogin, async (req, res) => {
  try {
    const users = await User.find();
    const business = await Business.find();

    res.locals.req = req;
    res.locals.activePage = 'admin/customers';
    res.render('admin/add-customer', {  users, business });
  } catch (err) {
    console.error(err);
    res.status(500).send('Error: ' + err.message);
  }
});
router.post('/admin/add-new-customer', requireSuperLogin, async (req, res) => {
  try {
      const { name, surname, gsm, email, no, ort, postcode,street,customerStatus } = req.body;
      const currentDate = new Date();
      const month = (currentDate.getMonth() + 1).toString().padStart(2, '0');
      const day = currentDate.getDate().toString().padStart(2, '0');
      const username = name + surname + month + day;
      const password = await bcrypt.hash(username, 10);

      const newCustomer = new User({
        name: name,
        password: password,
        surname: surname,
        gsm: gsm,
        email: email,
        no: no,
        ort: ort,
        postcode: postcode,
        street: street,
        customerStatus: customerStatus,
      });      
      await newCustomer.save();
      const templatePath = path.join(__dirname, 'mail/businessApproval.ejs');
      const renderedHtml = await ejs.renderFile(templatePath, { email,username, password:username });
      const customerMailOptions = {
        from: 'info@ilknurcengiz.com',
        to: email,
        subject: 'Glückwunsch! Ihr Unternehmen ist von me Time genehmigt.',
        html: renderedHtml,
      };
    
      await transporter.sendMail(customerMailOptions, (error, info) => {
        if (error) {
          console.error('Error:', error);
          req.session.error = 'An error occurred. Please contact us!';
			    res.redirect('/admin/customers');
        } else {
          res.locals.activePage = 'admin/customers';
		      res.redirect('/admin/customers');
        }
      });
		res.locals.activePage = 'admin/customers';
		res.redirect('/admin/customers');
  } catch (error) {
	   console.error('Error:', error);
	   req.session.error = 'An error occurred. Please contact us!';
	   return res.redirect('/admin/customers');
	}
});
router.get('/admin/edit-customer/:customerID', requireSuperLogin,  async (req, res) => {
  try {
    const customerID = req.params.customerID;
    const users = await User.findOne({ _id: customerID });
    const business = await Business.find();
    
    if (!users) {
      return res.status(404).send('User not found');
    }
    res.locals.req = req;
    res.locals.activePage = 'admin/customers';
    res.render('admin/edit-customer', {business,users });
  } catch (err) {
    console.error(err);
    res.status(500).send('Internal Server Error');
  }
}); 
router.post('/admin/edit-customer/:customerID', requireSuperLogin, async (req, res) => {
  try {
      const customerID = req.params.customerID;
      const { name, surname, email, gsm, street, no, ort, postcode, customerStatus  } = req.body;
      const users = await User.findById(customerID);
    
      if (!users) {
          req.session.error = 'Customer not found';
          return res.redirect('/admin/customers');
      }
      users.name = name;
      users.surname = surname;
      users.email = email;
      users.gsm = gsm;
      users.street = street;
      users.no = no;
      users.ort = ort;
      users.postcode = postcode;
      users.customerStatus = customerStatus;
      
      await users.save();
      res.locals.activePage = 'admin/customers';
      return res.redirect('/admin/customers');
  } catch (error) {
      console.error('Error:', error);
      req.session.error = 'An error occurred. Please contact us!';
      return res.redirect('/admin/customers');
  }
});
router.get('/admin/delete-customer/:customerID', async (req, res) => {
  try {
    const customerID = req.params.customerID;
    await User.findByIdAndRemove(customerID);
    res.locals.req = req;
    res.locals.activePage = 'admin/customers'; 
    return res.redirect('/admin/customers');
  } catch (error) {
    console.error("Error:", error);
    req.session.error = "An error occurred. Please contact us!";
    return res.redirect('/admin/customers'); 
  }
});
//APPLICATIONS
router.get('/admin/applications', requireSuperLogin, async (req, res) => {
  try {     
    const customerStatus = 'Waiting';
    const applications = await Application.find({customerStatus:customerStatus});
    const allapplications = await Application.find();
    const businessID = req.session.businessID;
    const business = await Business.findOne({ _id:businessID });
    res.locals.req = req;
    res.locals.activePage = 'admin/applications';
    res.render('admin/applications', { allapplications, applications,business  });
  } catch (err) {
    console.error(err);
    res.status(500).send('Internal Server Error');
  }
});
//PACKAGE
router.get('/admin/package', requireSuperLogin, async (req, res) => {
  try {
    const package = await Package.find();
    const businessID = req.session.businessID;
    const business = await Business.findOne({ _id: businessID });
    if (package.length === 0) {
      res.locals.req = req;
      res.locals.activePage = 'admin/package';
      res.render('admin/package', {  package: null,business });
    } else {
      res.locals.req = req;
      res.locals.activePage = 'admin/package';
      res.render('admin/package', {  package,business });
    }
  } catch (err) {
    console.error(err);
    res.status(500).send('Error: ' + err.message);
  }
});
router.get('/admin/add-package', requireSuperLogin, async (req, res) => {
  try {
    const package = await Package.find();
    const businessID = req.session.businessID;
    const business = await Business.findOne({ _id: businessID });
    if (package.length === 0) {
      res.locals.req = req;
      res.locals.activePage = 'admin/package';
      res.render('admin/add-package', {  package: null, business });
    } else {
      res.locals.req = req;
      res.locals.activePage = 'admin/package';
      res.render('admin/add-package', {  package, business });
    }
  } catch (err) {
    console.error(err);
    res.status(500).send('Error: ' + err.message);
  }
});
router.post("/admin/add-new-package", requireSuperLogin, async (req, res) => {
  try {
      const { packageName } = req.body;
      const newPackage = new Package({
        packageName: packageName,
      });
      await newPackage.save();
      res.locals.activePage = 'admin/package'; 
      return res.redirect('/admin/package');
  } catch (error) {
      console.error("Error:", error);
      req.session.error = "An error occurred. Please contact us!";
      return res.redirect('/admin/package'); 
  }
});
router.get('/admin/edit-package/:packageID', requireSuperLogin, async (req, res) => {
  try {
    const packageID = req.params.packageID;
    const package = await Package.findOne({ _id: packageID });
    const businessID = req.session.businessID;
    const business = await Business.findOne({ _id: businessID });
    if (!package) {
      return res.status(404).send('Package not found');
    }
    res.locals.req = req;
    res.locals.activePage = 'admin/package';
    res.render('admin/edit-package', { package, business });
  } catch (err) {
    console.error(err);
    res.status(500).send('Internal Server Error');
  }
});
router.post('/admin/edit-package/:packageID', requireSuperLogin, async (req, res) => {
  try {
      const packageID = req.params.packageID;
      const { packageName } = req.body;
      const package = await Package.findById(packageID);

      if (!package) {
          req.session.error = 'package not found';
          return res.redirect('/admin/package');
      }
      package.packageName = packageName;	
      await package.save();
      res.locals.activePage = 'admin/package';
      return res.redirect('/admin/package');
  } catch (error) {
      console.error('Error:', error);
      req.session.error = 'An error occurred. Please contact us!';
      return res.redirect('/admin/package');
  }
});
router.get('/admin/delete-package/:packageID', async (req, res) => {
  try {
    const packageID = req.params.packageID;
    await Package.findByIdAndRemove(packageID);

    res.locals.req = req;
    res.locals.activePage = 'admin/package'; 
    return res.redirect('/admin/package');
  } catch (error) {
    console.error("Error:", error);
    req.session.error = "An error occurred. Please contact us!";
    return res.redirect('/admin/package'); 
  }
});
module.exports = router;
