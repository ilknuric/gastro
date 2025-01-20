const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const path = require('path');
const multer = require('multer');
const ejs = require('ejs');
const nodemailer = require('nodemailer');
const Admin = require('../models/adminModel');
const Category = require('../models/categoryModel');
const Business = require('../models/businessModel');
const Workers = require('../models/workerModel');
const Service = require('../models/serviceModel');
const Product = require('../models/productModel');
const Orders = require('../models/orderModel');
const Application = require('../models/appModel');
const Promotion = require('../models/promoModel');
const Campaign = require('../models/campaignModel');
const ScheduleModel = require('../models/calendarModel');
const Holiday = require('../models/holidayModel');

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
function requireSuperLogin(req, res, next) {
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
function adjustTime(time, hours) {
  const [hh, mm] = time.split(':');
  const adjustedHours = parseInt(hh, 10) + hours;
  const adjustedHH = Math.max(0, adjustedHours);
  
  return `${adjustedHH.toString().padStart(2, '0')}:${mm}`;
}
//LOGIN
router.get('/admin/setup/:businessID', requireSuperLogin, async (req, res) => {
  try {
    const businessID = req.params.businessID;
    const business = await Business.findOne({ _id: businessID });
    const auth =1;
    const businessCommision = await Business.findOne({ auth: auth });
    const orders = await Orders.find({businessID:businessID});

    if (orders.length === 0) {
      res.locals.req = req;
      res.locals.activePage = 'admin/setup/';
      res.render('admin/setup/', { orders: null, business, services:null, products:null });
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
      res.locals.activePage = 'admin/setup/';
      res.render('admin/setup/', { business, services: serviceSales, products: productSales,businessCommision });
    }
  } catch (err) {
    console.error(err);
    res.status(500).send('Internal Server Error');
    res.render('admin/setup/404');
  }
});
router.get('/admin/logout', (req, res) => {
    delete req.session.businessID; 
    delete req.session.adminId; 
    delete req.session.auth; 
    res.redirect('/admin/login');
});
//PRODUCTS
router.get('/admin/setup/products/:businessID', requireSuperLogin, async (req, res) => {
  try {
    const businessID = req.params.businessID;
    const products = await Product.find({ businessID: businessID });
    const business = await Business.findOne({ _id: businessID });
    if (products.length === 0) {
      res.locals.req = req;
      res.locals.activePage = 'admin/setup/products';
      res.render('admin/setup/products', { products: null, business });
    } else {
      const servicesWithCategoryNames = [];
      for (const service of products) {
        const category = await Category.findById(service.category);
        const categoryDisplayName = category ? category.categoryName : 'Unknown';
        const serviceWithCategoryName = {
          ...service.toObject(),
          category: categoryDisplayName,
        };
        servicesWithCategoryNames.push(serviceWithCategoryName);
      }
      res.locals.req = req;
      res.locals.activePage = 'admin/setup/products';
      res.render('admin/setup/products', { products: servicesWithCategoryNames, business });
    }
  } catch (err) {
    console.error(err);
    res.status(500).send('Internal Server Error');
  }
});
router.get('/admin/setup/add-product/:businessID', requireSuperLogin, async (req, res) => {
  try {
    const categories = await Category.find();
    const businessID = req.params.businessID;
    const business = await Business.findOne({ _id: businessID });

    if (categories.length === 0) {
      res.locals.req = req;
      res.locals.activePage = 'admin/setup/products';
      res.render('admin/setup/add-product', {  categories: null,business });
    } else {
      res.locals.req = req;
      res.locals.activePage = 'admin/setup/products';
      res.render('admin/setup/add-product', {  categories, business });
    }
  } catch (err) {
    console.error(err);
    res.status(500).send('Internal Server Error');
  }
});
router.post("/admin/setup/add-new-product", requireSuperLogin, uploadproduct.single('productImage'), async (req, res) => {
  try {
    const { productName, description, price, status, category,businessID } = req.body;
    const productImage = req.file ? 'https://metime-schweiz.ch/assets/images/business/' + req.file.filename : null;
    const newProduct = new Product({
      productName: productName,
      description: description,
      price: price,
      status: status,
      category: category,
      businessID: businessID,
      productImage: productImage
    });
    await newProduct.save();
    res.locals.activePage = 'admin/setup/products';
    return res.redirect('/admin/setup/products/'+businessID);
    
  } catch (error) {
    console.error(error);
    res.status(500).send('Internal Server Error');
  }
});
router.get('/admin/setup/edit-product/:productID', requireSuperLogin,  async (req, res) => {
  try {
    const productID = req.params.productID;
    const products = await Product.findOne({ _id: productID });
    const categories = await Category.find();
    const businessID = products.businessID;
    const business = await Business.findOne({ _id: businessID });
    if (!products) {
      return res.status(404).send('Service not found');
    }
    res.locals.req = req;
    res.locals.activePage = 'admin/setup/products';
    res.render('admin/setup/edit-product', { products, categories, business });
  } catch (err) {
    console.error(err);
    res.status(500).send('Internal Server Error');
  }
}); 
router.post('/admin/setup/edit-product/:productID', requireSuperLogin, upload.single('productImage'), async (req, res) => {
  try {
      const productID = req.params.productID;
      const { productName, description, price, status, category,businessID  } = req.body;
      const products = await Product.findById(productID);
      const productImage = req.file ? 'https://metime-schweiz.ch/assets/images/business/' + req.file.filename : products.productImage;
      if (!products) {
          req.session.error = 'Product not found';
          return res.redirect('/admin/setup/products');
      }
      products.productName = productName;
      products.description = description;
      products.price = price;
      products.status = status;
      products.category = category;
      products.businessID = businessID;
      products.productImage = productImage;
      
      await products.save();
      res.locals.activePage = 'admin/setup/products';
      return res.redirect('/admin/setup/products/'+businessID);
  } catch (error) {
      console.error(error);
      res.status(500).send('Internal Server Error');
  }
});
router.get('/admin/setup/delete-product/:productID', async (req, res) => {
  try {
    const productID = req.params.productID;
    const products=await Product.findOne({ _id: productID });
    const businessID=products.businessID;
    await Product.findByIdAndRemove(productID);
    res.locals.req = req;
    res.locals.activePage = 'admin/setup/products'; 
    return res.redirect('/admin/setup/products/'+businessID);
  } catch (error) {
    console.error(error);
    res.status(500).send('Internal Server Error');
  }
});
//SERVICES
router.get('/admin/setup/services/:businessID', requireSuperLogin, async (req, res) => {
  try {
    const businessID = req.params.businessID;
    const services = await Service.find({ businessID: businessID });
    const business = await Business.findOne({ _id: businessID });
    if (services.length === 0) {
      res.locals.req = req;
      res.locals.activePage = 'admin/setup/services';
      res.render('admin/setup/services', { services: null, business });
    } else {
      const servicesWithCategoryNames = [];
      for (const service of services) {
        const category = await Category.findById(service.category);
        const categoryDisplayName = category ? category.categoryName : 'Unknown';
        const serviceWithCategoryName = {
          ...service.toObject(),
          category: categoryDisplayName,
        };
        servicesWithCategoryNames.push(serviceWithCategoryName);
      }

      res.locals.req = req;
      res.locals.activePage = 'admin/setup/services';
      res.render('admin/setup/services', { services: servicesWithCategoryNames, business });
    }
  } catch (err) {
    console.error(err);
    res.status(500).send('Internal Server Error');
  }
});
router.get('/admin/setup/add-service/:businessID', requireSuperLogin, async (req, res) => {
  try {
    const categories = await Category.find();
    const businessID = req.params.businessID;
    const business = await Business.findOne({ _id: businessID });

    if (categories.length === 0) {
      res.locals.req = req;
      res.locals.activePage = 'admin/setup/services';
      res.render('admin/setup/add-service', {  categories: null,business });
    } else {
      res.locals.req = req;
      res.locals.activePage = 'admin/services';
      res.render('admin/setup/add-service', {  categories, business });
    }
  } catch (err) {
    console.error(err);
    res.status(500).send('Internal Server Error');
  }
});
router.post("/admin/setup/add-new-service", requireSuperLogin, async (req, res) => {
  try {
      const { serviceName, businessID, description, price, hour, minutes, status, category, serviceType } = req.body;
      let durationMinutes;
      if (hour > 0) {
        const hourformin = hour * 60;
        durationMinutes = parseFloat(hourformin) + parseFloat(minutes);
      } else {
        durationMinutes = minutes;
      }
      const newService = new Service({
        serviceName: serviceName,
        description: description,
        price: price,
        durationMinutes: durationMinutes,
        status: status,
        category: category,
        serviceType: serviceType,
        businessID: businessID
      });
      await newService.save();
      res.locals.activePage = 'admin/setup/services'; 
      return res.redirect('/admin/setup/services/'+businessID);
  } catch (error) {
      console.error(err);
      res.status(500).send('Internal Server Error');
  }
});
router.get('/admin/setup/edit-service/:serviceID', requireSuperLogin, async (req, res) => {
  try {
    const serviceID = req.params.serviceID;
    const services = await Service.findOne({ _id: serviceID });
    const categories = await Category.find();
    const businessID = services.businessID;
    const business = await Business.findOne({ _id: businessID });

    if (!services) {
      return res.status(404).send('Service not found');
    }
    res.locals.req = req;
    res.locals.activePage = 'admin/setup/services';
    res.render('admin/setup/edit-service', { services, categories, business });
  } catch (err) {
    console.error(err);
    res.status(500).send('Internal Server Error');
  }
}); 
router.post('/admin/setup/edit-service/:serviceID', requireSuperLogin, async (req, res) => {
  try {
      const serviceID = req.params.serviceID;
      const { serviceName, description, price, hour, minutes, status, category, serviceType,businessID } = req.body;
      const services = await Service.findById(serviceID);

      if (!services) {
          req.session.error = 'Service not found';
          return res.redirect('/admin/setup/services/'+businessID);
      }
      let durationMinutes;
      if (hour > 0) {
        const hourformin = hour * 60;
        durationMinutes = parseFloat(hourformin) + parseFloat(minutes);
      } else {
        durationMinutes = minutes;
      }
      services.serviceName = serviceName;
      services.description = description;
      services.price = price;
      services.durationMinutes = durationMinutes;
      services.status = status;
      services.category = category;
      services.businessID = businessID;
      services.serviceType = serviceType;
      
      await services.save();

      res.locals.activePage = 'admin/setup/services';
      return res.redirect('/admin/setup/services/'+businessID);
  } catch (error) {
      console.error(err);
      res.status(500).send('Internal Server Error');
  }
});
router.get('/admin/setup/delete-service/:serviceID', async (req, res) => {
  try {
    const serviceID = req.params.serviceID;
    const services=await Service.findOne({ _id: serviceID });
    const businessID=services.businessID;
    await Service.findByIdAndRemove(serviceID);
    res.locals.req = req;
    res.locals.activePage = 'admin/setup/services'; 
    return res.redirect('/admin/setup/services/'+businessID);
  } catch (error) {
    console.error(error);
    res.status(500).send('Internal Server Error');
  }
});
//WORKERS
router.get('/admin/setup/workers/:businessID', requireSuperLogin, async (req, res) => {
  try {
    const businessID = req.params.businessID;
    const workers = await Workers.find({ businessID: businessID });
    const business = await Business.findOne({ _id: businessID });

    if (workers.length === 0) {
      res.locals.req = req;
      res.locals.activePage = 'admin/setup/workers';
      res.render('admin/setup/workers', { workers: null, business });
    } else {

    const workersWithServiceNames = [];
    for (const worker of workers) {
      const serviceIds = worker.services; 
      const services = await Service.find({ _id: { $in: serviceIds } });
      const serviceNames = services.map(service => service.serviceName).join(', ');
      workersWithServiceNames.push({
        ...worker.toObject(),
        serviceNames,
      });
    }
      res.locals.req = req;
      res.locals.activePage = 'admin/setup/workers';
      res.render('admin/setup/workers', { workers: workersWithServiceNames, business });
    }
  } catch (err) {
    console.error(err);
    res.status(500).send('Error: ' + err.message);
  }
});
router.get('/admin/setup/add-worker/:businessID', requireSuperLogin, async (req, res) => {
  try {
    const businessID = req.params.businessID;
    const business = await Business.findOne({ _id: businessID });
    const services = await Service.find();
    const offday = [false, false, false, false, false, false, false]; 

    if (services.length === 0) {
      res.locals.req = req;
      res.locals.activePage = 'admin/setup/workers';
      res.render('admin/setup/add-worker', {  services: null, business, offday });
    } else {
      res.locals.req = req;
      res.locals.activePage = 'admin/setup/workers';
      res.render('admin/setup/add-worker', {  services, business,offday });
    }
  } catch (err) {
    console.error(err);
    res.status(500).send('Error: ' + err.message);
  }
});
router.post("/admin/setup/add-new-worker", requireSuperLogin, async (req, res) => {
  try {
    const { name, surname, services, availability, startTime, endTime, offday,businessID,workerColor } = req.body;
    const newWorker = new Workers({
      name: name,
      surname: surname,
      services: services,
      availability: availability,
      businessID: businessID,
      workerColor: workerColor,		
    });

    for (let i = 0; i < 7; i++) {
      newWorker.hours[i] = startTime[i].map((start, index) => {
        const adjustedStart = start ? adjustTime(start, -1) : ""; 
        const adjustedEnd = endTime[i][index] ? adjustTime(endTime[i][index], -1) : "";
        const offDay = start === "" && endTime[i][index] === "" ? "on" : offday[i][index];
        return {
          start: adjustedStart,
          end: adjustedEnd,
          offday: offDay,
        };
      });
    }
    await newWorker.save();
    res.locals.activePage = "admin/setup/workers";
    return res.redirect("/admin/setup/workers/"+businessID);
  } catch (error) {
    console.error(error);
    res.status(500).send('Internal Server Error');
  }
});
router.get('/admin/setup/edit-worker/:workerID', requireSuperLogin, async (req, res) => {
  try {
    const workerID = req.params.workerID;
    const workers = await Workers.findOne({ _id: workerID });
    const services = await Service.find();
    const businessID = workers.businessID;
    const business = await Business.findOne({ _id: businessID });

    if (!workers) {
      return res.status(404).send('Employee not found');
    }
    res.locals.req = req;
    res.locals.activePage = 'admin/setup/workers';
    res.render('admin/setup/edit-worker', { workers,services,business });
  } catch (err) {
    console.error(err);
    res.status(500).send('Internal Server Error');
  }
}); 
router.post('/admin/setup/edit-worker/:workerID', requireSuperLogin, async (req, res) => {
  try {
    const workerID = req.params.workerID;
    const { name, surname, services, availability, startTime, endTime, offday,businessID, workerColor } = req.body;
    const worker = await Workers.findById(workerID);

    if (!worker) {
      req.session.error = 'Worker not found';
      return res.redirect('/admin/workers/'+businessID);
    }
    worker.name = name;
    worker.surname = surname;
    worker.availability = availability;
    worker.services = services;
    worker.workerColor = workerColor;

    for (let i = 0; i < 7; i++) {
      worker.hours[i] = startTime[i].map((start, index) => {
        const adjustedStart = start ? adjustTime(start, -1) : ""; 
        const adjustedEnd = endTime[i][index] ? adjustTime(endTime[i][index], -1) : "";
        const offDay = start === "" && endTime[i][index] === "" ? "on" : offday[i][index];
        return {
          start: adjustedStart,
          end: adjustedEnd,
          offday: offDay,
        };
      });
    }
    await worker.save();
    res.locals.activePage = 'admin/setup/workers';
    return res.redirect('/admin/setup/workers/'+businessID);
  } catch (error) {
    console.error(error);
    res.status(500).send('Internal Server Error');
  }
});
router.get('/admin/setup/delete-worker/:workerID', async (req, res) => {
  try {
    const workerID = req.params.workerID;
    const workers=await Workers.findOne({ _id: workerID });
    const businessID=workers.businessID;
    await Workers.findByIdAndRemove(workerID);
    res.locals.req = req;
    res.locals.activePage = 'admin/setup/workers'; 
    return res.redirect('/admin/setup/workers/'+businessID);
  } catch (error) {
    console.error(error);
    res.status(500).send('Internal Server Error');
  }
});
//SETTINGS
router.get('/admin/setup/settings/:businessID', requireSuperLogin, async (req, res) => {
  try {
    const businessID = req.params.businessID;
    const business = await Business.findOne({ _id: businessID });
    res.locals.req = req;
    res.locals.activePage = 'admin/setup/settings';
    res.render('admin/setup/settings', { business });
  } catch (err) {
    console.error(err);
    res.status(500).send('Internal Server Error');
  }
});
router.post('/admin/setup/edit-business/:businessID', requireSuperLogin, upload.single('businessImage'), async (req, res) => {
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
          businessDescription,
          businessStreet,
          businessNr,
          businessPostcode,
          businessOrt,
          businessLat,
        businessLong,
        businessStatus,
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
      business.businessDescription = businessDescription;
      business.businessStreet = businessStreet;
      business.businessNr = businessNr;
      business.businessPostcode = businessPostcode;
      business.businessOrt = businessOrt;
      business.businessLat = businessLat;
      business.businessLong = businessLong;
      business.businessStatus = businessStatus;
      business.auth = auth;
      if (req.file) {
          business.businessImage = 'https://metime-schweiz.ch/assets/images/business/' + req.file.filename;
      }

      business.businessLocation = businessLocation;

      await business.save();

      res.locals.activePage = 'admin/setup/settings';
      return res.redirect('/admin/setup/settings/'+businessID);
  } catch (error) {
      console.error(error);
      res.status(500).send('Internal Server Error');
  }
});
router.get('/admin/setup/security/:businessID', requireSuperLogin, async (req, res) => {
  try {
	  const passError = req.session.passError;
    req.session.passError = null;
	  	  const passSuccess = req.session.passSuccess;
    req.session.passSuccess = null;
    const businessID = req.params.businessID;
    const business = await Business.findOne({ _id: businessID });
    const admin = await Admin.findOne({ businessID: businessID });

    res.locals.req = req;
    res.locals.activePage = 'admin/setup/settings';
    res.render('admin/setup/security', { business, admin, passError,passSuccess });
  } catch (err) {
    console.error(err);
    res.status(500).send('Internal Server Error');
  }
});
router.post('/admin/setup/edit-userentrance/:adminID', requireSuperLogin, async (req, res) => {
    try {
        const adminID = req.params.adminID;
        const admin = await Admin.findOne({ _id:adminID });
        const { username, currentPassword, newPasswordOne, newPasswordTwo,businessID } = req.body;

        if (!admin) {
req.session.passError = "Admin-Benutzer nicht gefunden";
          return res.redirect('/admin/setup/security/'+businessID);
        }
        const isPasswordValid = await bcrypt.compare(currentPassword, admin.password);
        if (!isPasswordValid) {
req.session.passError = "Das aktuelle Passwort ist nicht korrekt";
          return res.redirect('/admin/setup/security/'+businessID);
        }
        if (newPasswordOne !== newPasswordTwo) {
req.session.passError = "Passwörter stimmten nicht überein";
        return res.redirect('/admin/setup/security/'+businessID);
        }
req.session.passError = null;
      req.session.passSuccess = "das Passwort wurde erfolgreich geändert";
        admin.username = username;
        admin.password = await bcrypt.hash(newPasswordOne, 10);
        await admin.save();

        res.locals.activePage = 'admin/setup/settings';
        return res.redirect('/admin/setup/security/'+businessID);
    } catch (error) {
        console.error('Error:', error);
        res.status(500).send('Internal Server Error: ' + error.message);
    }
});
//COUPON CODE
router.get('/admin/setup/promotion/:businessID', requireSuperLogin, async (req, res) => {
  try {
    const businessID = req.params.businessID;
    const promotions = await Promotion.find({ businessID: businessID });
    const business = await Business.findOne({ _id: businessID });

    if (promotions.length === 0) {
      res.locals.req = req;
      res.locals.activePage = 'admin/setup/promotion';
      res.render('admin/setup/promotions', { promotions: null, business });
    } else {
      res.locals.req = req;
      res.locals.activePage = 'admin/setup/promotion';
      res.render('admin/setup/promotions', { promotions, business });
    }
  } catch (err) {
    console.error(err);
    res.status(500).send('Error: ' + err.message);
  }
});
router.get('/admin/setup/add-coupon/:businessID', requireSuperLogin, async (req, res) => {
  try {
    const businessID = req.params.businessID;
    const promotions = await Promotion.find({ businessID: businessID });
    const business = await Business.findOne({ _id: businessID });

    if (promotions.length === 0) {
      res.locals.req = req;
      res.locals.activePage = 'admin/setup/promotion';
      res.render('admin/setup/add-coupon', {  promotions: null, business });
    } else {
      res.locals.req = req;
      res.locals.activePage = 'admin/setup/promotion';
      res.render('admin/setup/add-coupon', {  promotions, business });
    }
  } catch (err) {
    console.error(err);
    res.status(500).send('Error: ' + err.message);
  }
});
router.post("/admin/setup/add-new-coupon", requireSuperLogin, async (req, res) => {
  try {      
      const { couponCode, couponType, couponStatus, couponValue, minValue, businessID} = req.body;
      const newCoupon = new Promotion({
        couponCode: couponCode,
        couponType: couponType,
        couponStatus: couponStatus,
        couponValue: couponValue,
        minValue: minValue,
        businessID: businessID,
      });
      await newCoupon.save();
      res.locals.activePage = 'admin/setup/promotion'; 
      return res.redirect('/admin/setup/promotion/'+businessID);
  } catch (error) {
      console.error(error);
      res.status(500).send('Internal Server Error');
  }
});
router.get('/admin/setup/edit-coupon/:couponID', requireSuperLogin, async (req, res) => {
    try {
      const couponID = req.params.couponID;
      const promotions = await Promotion.findOne({ _id: couponID });
      const businessID = promotions.businessID;
      const business = await Business.findOne({ _id: businessID });
      if (!promotions) {
        return res.status(404).send('Coupon code not found');
      }
      res.locals.req = req;
      res.locals.activePage = 'admin/setup/promotion';
      res.render('admin/setup/edit-coupon', { promotions, business });
    } catch (err) {
      console.error(err);
      res.status(500).send('Internal Server Error');
    }
});
router.get('/admin/setup/delete-coupon/:couponID', async (req, res) => {
  try {
    const couponID = req.params.couponID;
    const coupons=await Promotion.findOne({ _id: couponID });
    const businessID=coupons.businessID;
    await Promotion.findByIdAndRemove(couponID);
    res.locals.req = req;
    res.locals.activePage = 'admin/setup/promotion'; 
    return res.redirect('/admin/setup/promotion/'+businessID);
  } catch (error) {
    console.error(error);
    res.status(500).send('Internal Server Error');
  }
});
router.post('/admin/setup/edit-coupon/:couponID', requireSuperLogin, async (req, res) => {
    try {
        const couponID = req.params.couponID;
        const { couponCode, couponType, couponStatus, couponValue, minValue,businessID } = req.body;
        const promotions = await Promotion.findById(couponID);

        if (!promotions) {
            req.session.error = 'Coupon Code not found';
            return res.redirect('/admin/setup/promotion');
        }
        promotions.couponCode = couponCode;
        promotions.couponType = couponType;
        promotions.couponStatus = couponStatus;
        promotions.couponValue = couponValue;
        promotions.minValue = minValue;
        await promotions.save();

        res.locals.activePage = 'admin/setup/promotion';
        return res.redirect('/admin/setup/promotion/'+businessID);
    } catch (error) {
      console.error(error);
      res.status(500).send('Internal Server Error');
    }
});
//CAMPAIGNS
router.get('/admin/setup/campaigns/:businessID', requireSuperLogin, async (req, res) => {
  try {
    const businessID = req.params.businessID;
    const campaigns = await Campaign.find({ businessID: businessID });
    const business = await Business.findOne({ _id: businessID });

    if (campaigns.length === 0) {
      res.locals.req = req;
      res.locals.activePage = 'admin/setup/campaigns';
      return res.render('admin/setup/campaigns', { campaigns: null, business });
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
    res.locals.activePage = 'admin/setup/campaigns';
    return res.render('admin/setup/campaigns', { campaigns, business });
  } catch (err) {
    console.error(err);
    res.status(500).send('Error: ' + err.message);
  }
});
router.get('/admin/setup/add-campaign/:businessID', requireSuperLogin, async (req, res) => {
  try {
    const businessID = req.params.businessID;
    const campaigns = await Campaign.find({ businessID: businessID });
    const business = await Business.findOne({ _id: businessID });
    const services = await Service.find({ businessID: businessID });

    if (campaigns.length === 0) {
      res.locals.req = req;
      res.locals.activePage = 'admin/setup/campaigns';
      res.render('admin/setup/add-campaign', {  campaigns: null, business, services });
    } else {
      res.locals.req = req;
      res.locals.activePage = 'admin/setup/campaigns';
      res.render('admin/setup/add-campaign', {  campaigns, business, services });
    }
  } catch (err) {
    console.error(err);
    res.status(500).send('Error: ' + err.message);
  }
});
router.get('/admin/setup/add-product-campaign/:businessID', requireSuperLogin, async (req, res) => {
  try {
    const businessID = req.params.businessID;
    const campaigns = await Campaign.find({ businessID: businessID });
    const business = await Business.findOne({ _id: businessID });
    const products = await Product.find({ businessID: businessID });

    if (campaigns.length === 0) {
      res.locals.req = req;
      res.locals.activePage = 'admin/setup/campaigns';
      res.render('admin/setup/add-product-campaign', {  campaigns: null, business, products });
    } else {
      res.locals.req = req;
      res.locals.activePage = 'admin/setup/campaigns';
      res.render('admin/setup/add-product-campaign', {  campaigns, business, products });
    }
  } catch (err) {
    console.error(err);
    res.status(500).send('Error: ' + err.message);
  }
});
router.post("/admin/setup/add-new-campaign", requireSuperLogin, async (req, res) => {
  try {
    const { campaignStartDate, campaignEndDate, campaignDesciption, campaignName, serviceID, currentPrice, campaignPrice, campaignType,businessID } = req.body;
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
      businessID: businessID,
      campaignDetails: campaignDetails,
      campaignType: campaignType,
    });

    await newCampaign.save();
    res.locals.activePage = 'admin/setup/campaigns'; 
    return res.redirect('/admin/setup/campaigns/'+businessID);
  } catch (error) {
    console.error(error);
    res.status(500).send('Internal Server Error');
  }
});
router.post("/admin/setup/add-new-product-campaign", requireSuperLogin, async (req, res) => {
  try {
    const { campaignStartDate, campaignEndDate, campaignDesciption, campaignName, productID, currentPrice, campaignPrice, campaignType, businessID } = req.body;
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
      businessID: businessID,
      campaignDetails: campaignDetails,
      campaignType: campaignType,
    });

    await newCampaign.save();
    
    res.locals.activePage = 'admin/setup/campaigns'; 
    return res.redirect('/admin/setup/campaigns/'+businessID);
  } catch (error) {
    console.error(error);
    res.status(500).send('Internal Server Error');
  }
});
router.get('/admin/setup/edit-campaign/:campaignID', requireSuperLogin, async (req, res) => {
    try {
      const campaignID = req.params.campaignID;
      const campaigns = await Campaign.findOne({ _id: campaignID });
      const businessID = campaigns.businessID;
      const business = await Business.findOne({ _id: businessID });
      const services = await Service.find({ businessID: businessID });
      const products = await Product.find({ businessID: businessID });

      if (!campaigns) {
        return res.status(404).send('Coupon code not found');
      }
      res.locals.req = req;
      res.locals.activePage = 'admin/setup/campaigns';
      res.render('admin/setup/edit-campaign', { campaigns, business,services, products });
    } catch (err) {
      console.error(err);
      res.status(500).send('Internal Server Error');
    }
});
router.get('/admin/setup/delete-campaign/:campaignID', async (req, res) => {
  try {
    const campaignID = req.params.campaignID;
    const campaign=await Campaign.findOne({ _id: campaignID });
    const businessID=campaign.businessID;
    await Campaign.findByIdAndRemove(campaignID);
    res.locals.req = req;
    res.locals.activePage = 'admin/setup/campaigns'; 
    return res.redirect('/admin/setup/campaigns/'+businessID);
  } catch (error) {
    console.error(error);
    res.status(500).send('Internal Server Error');
  }
});
router.post('/admin/setup/edit-campaign/:campaignID', requireSuperLogin, async (req, res) => {
  try {
      const campaignID = req.params.campaignID;
      const { campaignStartDate, campaignEndDate, campaignRatio, campaignDesciption, campaignName, campaignType,serviceID, productID, currentPrice, campaignPrice, businessID } = req.body;
      const campaign = await Campaign.findById(campaignID);

      if (!campaign) {
          req.session.error = 'Campaign not found';
          return res.redirect('/admin/setup/campaigns');
      }
      campaign.campaignStartDate = campaignStartDate;
      campaign.campaignEndDate = campaignEndDate;
      campaign.campaignRatio = campaignRatio;
      campaign.campaignDesciption = campaignDesciption;
      campaign.campaignName = campaignName;
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
      res.locals.activePage = 'admin/setup/campaigns';
      return res.redirect('/admin/setup/campaigns/'+businessID);
  } catch (error) {
    console.error(error);
    res.status(500).send('Internal Server Error');
  }
});
//ORDERS
router.get('/admin/setup/orders/:businessID', requireSuperLogin, async (req, res) => {
  try {
	const paymentStatus="Success";
    const businessID = req.params.businessID;
    const orders = await Orders.find({ businessID: businessID, paymentStatus:paymentStatus });
    const business = await Business.findOne({ _id: businessID });
    const auth=1;
    const businessCommision = await Business.findOne({ auth: auth });
    if (orders.length === 0) {
      res.locals.req = req;
      res.locals.activePage = 'admin/setup/orders';
      res.render('admin/setup/orders', { orders: null, business, businessCommision  });
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
    res.locals.activePage = 'admin/setup/orders';
    res.render('admin/setup/orders', { orders: ordersWithSchedule, business, businessCommision });
    }
  } catch (err) {
    console.error(err);
    res.status(500).send('Error: ' + err.message);
  }
});
router.post('/admin/setup/admin-orders', async (req, res) => {
  try {
    const startDate = req.body.startDate;
    const endDate = req.body.endDate;
    const businessID = req.body.businessID;
    const business = await Business.findOne({ _id: businessID });
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
    res.locals.activePage = 'admin/setup/orders';
    res.render('admin/setup/orders', { orders, business });
  } catch (err) {
    console.error('Error searching for orders:', err);
    res.status(500).send('Internal Server Error');
  }
});
//IMAGES
router.get('/admin/setup/saloon-images/:businessID', requireSuperLogin, async (req, res) => {
  try {
    const businessID = req.params.businessID;
    const business = await Business.findOne({_id:businessID});

    if (!business) {
      return res.status(200).send('Keine Daten in der Tabelle verfügbar');
    }
    res.locals.req = req;
    res.locals.activePage = 'admin/setup/saloon-images';
    res.render('admin/setup/saloon-images', { business });
  } catch (err) {
    console.error(err);
    res.status(500).send('Internal Server Error');
  }
});
router.post('/admin/setup/delete-images', async (req, res) => {
  try {
      const { selectedImages, businessID } = req.body;
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
router.post('/admin/setup/upload-images', uploadSaloon, async (req, res) => {
  try {
    const baseImageUrl = 'https://metime-schweiz.ch/assets/images/business/';
    const businessID = req.body.businessID;
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
//CALENDER
router.get('/admin/setup/calendar/:businessID', requireSuperLogin, async (req, res) => {
  try {     
    const businessStatus = 'Waiting';
    const applications = await Application.find({businessStatus:businessStatus});
    const allapplications = await Application.find();
    const businessID = req.params.businessID;
    const business = await Business.findOne({ _id: businessID });
    const availability = 'Available';
    const workers = await Workers.find({ businessID,  availability: availability});
    res.locals.req = req;
    res.locals.activePage = 'admin/setup/calendar';
    res.render('admin/setup/calendar', { allapplications, applications,business ,workers });
  } catch (err) {
    console.error(err);
    res.status(500).send('Internal Server Error');
  }
});
router.get('/admin/setup/404', async (req, res) => {
  try {
      res.render('admin/setup/404');
  } catch (err) {
      console.error(err);
      res.status(500).send('Internal Server Error');
  }
});
//HOLIDAYS
router.get('/admin/setup/holiday/:businessID', requireSuperLogin, async (req, res) => {
  try {
    const businessID = req.params.businessID;
    const business = await Business.findOne({ _id: businessID });
    const holidays = await Holiday.find({ businessID: businessID });

    if (holidays.length === 0) {
      res.locals.req = req;
      res.locals.activePage = 'admin/setup/holiday';
      res.render('admin/setup/holiday', { holidays: null, business });
    } else {
      const holidaysWithWorkerNames = [];
      for (const holiday of holidays) {
        const workerIDs = holiday.workerID; 
        const workers = await Workers.find({ _id: { $in: workerIDs } });
        const workerNames = workers.map(worker => `${worker.name} ${worker.surname}`).join(', ');
        holidaysWithWorkerNames.push({
          ...holiday.toObject(),
          workerNames,
        });
      }
      res.locals.req = req;
      res.locals.activePage = 'admin/setup/holiday';
      res.render('admin/setup/holiday', { holidays: holidaysWithWorkerNames, business });
    }
  } catch (err) {
    console.error(err);
    res.status(500).send('Error: ' + err.message);
  }
});
router.get('/admin/setup/add-holiday/:businessID', requireSuperLogin, async (req, res) => {
  try {
    const businessID = req.params.businessID;
    const business = await Business.findOne({ _id: businessID });
    const workers = await Workers.find({businessID:businessID});

    if (workers.length === 0) {
      res.locals.req = req;
      res.locals.activePage = 'admin/setup/holiday';
      res.render('admin/setup/add-holiday', {  workers: null, business });
    } else {
      res.locals.req = req;
      res.locals.activePage = 'admin/setup/holiday';
      res.render('admin/setup/add-holiday', {  workers, business });
    }
  } catch (err) {
    console.error(err);
    res.status(500).send('Error: ' + err.message);
  }
});
router.post("/admin/setup/add-new-holiday", requireSuperLogin, async (req, res) => {
  try {
    const { workerID, HolidayStartDate, HolidayEndDate, businessID } = req.body;
    console.log(workerID)
    const newHoliday = new Holiday({
      workerID: workerID,
      HolidayStartDate: HolidayStartDate,
      HolidayEndDate: HolidayEndDate,
      businessID: businessID,
    });
    await newHoliday.save();
    res.locals.activePage = "admin/setup/holiday";
    return res.redirect("/admin/setup/holiday/"+businessID);
  } catch (error) {
    console.error(error);
    res.status(500).send('Internal Server Error');
  }
});
router.get('/admin/setup/edit-holiday/:holidayID', requireSuperLogin, async (req, res) => {
  try {
    const holidayID = req.params.holidayID;
    const holidays = await Holiday.findOne({ _id: holidayID });
    const businessID = holidays.businessID;
    const business = await Business.findOne({ _id: businessID });
    const workers = await Workers.find({businessID:businessID});
    if (!holidays) {
      return res.status(404).send('Holiday not found');
    }
    res.locals.req = req;
    res.locals.activePage = 'admin/setup/holiday';
    res.render('admin/setup/edit-holiday', { holidays,workers,business });
  } catch (err) {
    console.error(err);
    res.status(500).send('Internal Server Error');
  }
}); 
router.post('/admin/setup/edit-holiday/:holidayID', requireSuperLogin, async (req, res) => {
  try {
    const holidayID = req.params.holidayID;
    const { workerID, HolidayStartDate, HolidayEndDate, businessID} = req.body;
    const holiday = await Holiday.findById(holidayID);

    if (!holiday) {
      req.session.error = 'Holiday not found';
      return res.redirect('/admin/holiday/'+businessID);
    }
    holiday.workerID = workerID;
    holiday.HolidayStartDate = HolidayStartDate;
    holiday.HolidayEndDate = HolidayEndDate;
    holiday.businessID = businessID;
    
    await holiday.save();
    res.locals.activePage = 'admin/setup/holiday';
    return res.redirect('/admin/setup/holiday/'+businessID);
  } catch (error) {
    console.error(error);
    res.status(500).send('Internal Server Error');
  }
});
router.get('/admin/setup/delete-holiday/:holidayID', async (req, res) => {
  try {
    const holidayID = req.params.holidayID;
    const holiday=await Holiday.findOne({ _id: holidayID });
    const businessID=holiday.businessID;
    await Holiday.findByIdAndRemove(holidayID);
    res.locals.req = req;
    res.locals.activePage = 'admin/setup/holiday'; 
    return res.redirect('/admin/setup/holiday/'+businessID);
  } catch (error) {
    console.error(error);
    res.status(500).send('Internal Server Error');
  }
});

module.exports = router;
