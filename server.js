const express = require('express');
const mongoose = require('mongoose');
const session = require('express-session');
const path = require('path');
const multer = require('multer');
const port = 1917;
const app = express();

app.use(express.static(__dirname)); 
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Session setup
app.use(session({
    secret: 'your_secret_key', 
    resave: false,
    saveUninitialized: true,
}));

// MongoDB connection
mongoose.connect('mongodb://localhost:27017/Venus', { useNewUrlParser: true, useUnifiedTopology: true });
const db = mongoose.connection;
db.once('open', () => {
    console.log("Mongodb Connection Successful");
});

// User schema
const userSchema = new mongoose.Schema({
    username: String,
    email: String,
    mobile: String,
    password: String,
});
const Users = mongoose.model('Registration', userSchema);

// Service schema
const serviceSchema = new mongoose.Schema({
    name: String,
});
const Service = mongoose.model('Service', serviceSchema);

// Booking schema
const bookingSchema = new mongoose.Schema({
    name: String,
    mobile: String,
    service: String,  
    serviceTime: Date,
    status: { type: String, default: "Pending" }
});
const Booking = mongoose.model('Booking', bookingSchema);

// Contact schema
const contactSchema = new mongoose.Schema({
    name: String,
    phone: String,
    mail: String, 
    message: String,
});
const Contacts = mongoose.model('Conatcts', contactSchema);


// Gallery schema
const galleryImageSchema = new mongoose.Schema({
    filename: { type: String, required: true },
});
const GalleryImage = mongoose.model('GalleryImage', galleryImageSchema);


// Admin schema
const adminSchema = new mongoose.Schema({
    adminName: String,
    adminPassword: String
});
const Admin = mongoose.model('Admin', adminSchema);

// Admin Credentials
async function createDefaultAdmin() {
    const existingAdmin = await Admin.findOne({ adminName: 'Venusadmin2024' });
    
    if (!existingAdmin) {
        const newAdmin = new Admin({
            adminName: 'Venusadmin2024',
            adminPassword: '1917'
        });

        await newAdmin.save();
        console.log('Default admin created: Venusadmin2024');
    }
}

createDefaultAdmin();



// Registration
app.post('/register', async (req, res) => {
    const { username, email, mobile, password } = req.body;
    try {
        const existingUser = await Users.findOne({ email });
        if (existingUser) {
            res.send(`<script>alert('Email already registered. Please use another email.');window.location.href='/register.html';</script>`);
        } else {
            const user = new Users({ username, email, mobile, password });
            await user.save();
            res.send(`<script>alert('Successfully Registered'); window.location.href='/register.html';</script>`);
        }
    } catch (err) {
        res.status(500).send(`<script>alert('Error registering user. Please try again.'); window.location.href='/register.html';</script>`);
    }
});

app.get('/admin', (req, res) => {
    res.sendFile(path.join(__dirname, 'Admin', 'index.html')); 
});



// User sign-in
app.post('/signin', async (req, res) => {
    const { username, password } = req.body;
    try {
        const user = await Users.findOne({ username, password });
        if (user) {
            req.session.username = user.username;
            res.send(`<script>alert('Login successful!'); window.location.href='/';</script>`);
        } else {
            res.send(`<script>alert('Invalid credentials'); window.location.href='/signin.html';</script>`);
        }
    } catch (err) {
        res.status(500).send(`<script>alert('Error during login. Please try again.'); window.location.href='/signin.html';</script>`);
    }
});

app.get('/users', async (req, res) => {
    try {
        const users = await Users.find(); 
        res.json(users);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch users' });
    }
});



// Add service
app.post('/add_service', async (req, res) => {
    const { service } = req.body;
    try {
        const newService = new Service({ name: service });
        await newService.save();
        res.send(`<script>alert('Service added successfully!'); window.location.href='/admin/add_services.html';</script>`);
    } catch (err) {
        res.status(500).send(`<script>alert('Error adding service. Please try again.'); window.location.href='/admin/add_services.html';</script>`);
    }
});


app.get('/services-list', async (req, res) => {
    try {
        const services = await Service.find();
        res.json(services);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch services' });
    }
});

// Add booking
app.post('/add-booking', async (req, res) => {
    const { name, mobile, service, serviceTime } = req.body;
    try {
        const selectedService = await Service.findById(service);
        if (!selectedService) {
            return res.status(404).json({ success: false, message: 'Service not found' });
        }
        const newBooking = new Booking({
            name,
            mobile,
            service: selectedService.name,
            serviceTime,
            status: "Pending"
        });
        await newBooking.save();
        res.status(200).json({ success: true });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error adding booking' });
    }
});

// Update booking status
app.post('/update-booking-status', async (req, res) => {
    const { bookingId, status } = req.body;
    try {
        await Booking.updateOne({ _id: bookingId }, { status });
        res.status(200).json({ message: 'Status updated successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Error updating status' });
    }
});

// Delete service by ID
app.delete('/delete_service/:id', async (req, res) => {
    const { id } = req.params;
    try {
        await Service.findByIdAndDelete(id);
        res.status(200).json({ message: 'Service deleted successfully' });
    } catch (error) {
        res.status(500).json({ error: 'Failed to delete service' });
    }
});

// Get list of bookings
app.get('/bookings-list', async (req, res) => {
    try {
        const bookings = await Booking.find();
        res.json(bookings);
    } catch (error) {
        res.status(500).json([]);
    }
});

// Update booking by ID
app.put('/update-booking/:id', async (req, res) => {
    const { id } = req.params;
    const { status } = req.body;
    try {
        await Booking.findByIdAndUpdate(id, { status });
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ success: false });
    }
});


app.get('/get-user-bookings', async (req, res) => {
    try {
        if (!req.session.username) {
            return res.status(401).json({ message: 'Not authorized. Please log in.' });
        }

        const currentBookings = await Booking.find({ name: req.session.username, status: { $ne: 'Completed' } });
        const previousBookings = await Booking.find({ name: req.session.username, status: 'Completed' });

        res.json({
            currentBookings: currentBookings,
            previousBookings: previousBookings
        });
    } catch (error) {
        res.status(500).json({ message: 'Error fetching bookings' });
    }
});



// login status
app.get('/check-login-status', (req, res) => {
    if (req.session.username) {
        res.json({ loggedIn: true, username: req.session.username });
    } else {
        res.json({ loggedIn: false });
    }
});

// User logout
app.get('/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            return res.redirect('/');
        }
        res.clearCookie('connect.sid');
        res.redirect('/signin.html');
    });
});



// Contacts
app.post('/contact', async (req, res) => {
    const { name, phone, mail, message } = req.body; 

    try {
        const contact = new Contacts({ name, phone, mail, message });
        await contact.save();

        res.send(`<script>alert('Successfully submitted your message. Thank you!'); window.location.href='/contact.html';</script>`);
    } catch (err) {
        res.status(500).send(`<script>alert('Error saving your message. Please try again.'); window.location.href='/contact.html';</script>`);
    }
});


app.get('/contact', async (req, res) => {
    try {
        const contacts = await Contacts.find();
        res.json(contacts);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch Contacts' });
    }
});




// Gallery
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'Assets/Images/Gallery');
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + '-' + file.originalname);
    },
});
const upload = multer({ storage: storage });


app.post('/upload-gallery', upload.array('file'), async (req, res) => {
    try {
        
        for (const file of req.files) {
            const newImage = new GalleryImage({ filename: file.filename });
            await newImage.save();
        }
        res.send(`<script>alert('Image Added Successfully'); window.location.href='/Admin/gallery_update.html';</script>`);
       
    } catch (err) {
        res.status(500).send(err.message);
    }
});


app.get('/api/images', async (req, res) => {
    try {
        const images = await GalleryImage.find();
        res.json(images);
    } catch (err) {
        res.status(500).send(err.message);
    }
});


app.delete('/api/images/:id', async (req, res) => {
    try {
        await Image.findByIdAndDelete(req.params.id);
        res.status(204).send();
    } catch (err) {
        res.status(500).send(err.message);
    }
});


app.get('/gallery_update.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'Admin', 'gallery_update.html'));
});

app.delete('/delete-image/:id', async (req, res) => {
    try {
        await GalleryImage.findByIdAndDelete(req.params.id);
        res.status(200).json({ message: 'Image deleted successfully' });
    } catch (err) {
        res.status(500).send(err.message);
    }
});


app.use('/Admin', express.static(path.join(__dirname, 'Admin')));
app.use('/User', express.static(path.join(__dirname, 'User')));
app.use('/Assets', express.static(path.join(__dirname, 'Assets')));



/////Admin Login Starting/////

app.post('/admin_login', async (req, res) => {
    const { adminName, adminPassword } = req.body;

    try {
        const admin = await Admin.findOne({ adminName });

        if (admin && admin.adminPassword === adminPassword) {
            req.session.admin = adminName;
            console.log('Session after login:', req.session);
            return res.send('<script>alert("Login successful!"); window.location.href="admin/users.html";</script>');
        } else {
            return res.send('<script>alert("Invalid credentials!"); window.location.href="admin/index.html";</script>');
        }
    } catch (err) {
        res.status(500).send('Server error');
    }
});

app.post('/forgot_password', async (req, res) => {
    const { username, newPassword, confirmNewPassword } = req.body;
    if (username !== 'Venusadmin2024') {
        return res.send('<script>alert("Incorrect Secret Code.!"); window.location.href="admin/frgt_pwd.html";</script>');
    }

    if (newPassword !== confirmNewPassword) {
        return res.send('<script>alert("Passwords do not match.!"); window.location.href="admin/frgt_pwd.html";</script>');
    }

    try {
        const admin = await Admin.findOne({ adminName: 'Venusadmin2024' });
        if (!admin) {
            return res.send('<script>alert("Admin not found in the database.!"); window.location.href="admin/frgt_pwd.html";</script>');
        }

        admin.adminPassword = newPassword;
        await admin.save();
        return res.send('<script>alert("Password successfully updated. You can now login with your new password.!"); window.location.href="admin/index.html";</script>');
        
    } catch (error) {
        console.error(error);''
        return res.send('<script>alert("An error occurred while updating the password ?"); window.location.href="admin/frgt_pwd.html";</script>');
        
    }
});



// Serve static HTML files
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'index.html')));
app.get('/about', (req, res) => res.sendFile(path.join(__dirname, 'about.html')));
app.get('/services', (req, res) => res.sendFile(path.join(__dirname, 'services.html')));
app.get('/gallery', (req, res) => res.sendFile(path.join(__dirname, 'gallery.html')));
app.get('/contact', (req, res) => res.sendFile(path.join(__dirname, 'contact.html')));
app.get('/message', (req, res) => res.sendFile(path.join(__dirname, 'message.html')));
app.get('/login', (req, res) => res.sendFile(path.join(__dirname, 'signin.html')));
app.get('/admin', (req, res) => res.sendFile(path.join(__dirname, 'Admin', 'index.html')));




// Server Started
app.listen(port, () => {
    console.log(`Server started on port ${port}`);
});
