// Firebase Configuration
const firebaseConfig = {
    apiKey: "AIzaSyDy5PXHDOWEASIxRd2bukF5FRscxFy9ZwQ",
    authDomain: "navithya-e33ae.firebaseapp.com",
    databaseURL: "https://navithya-e33ae-default-rtdb.firebaseio.com",
    projectId: "navithya-e33ae",
    storageBucket: "navithya-e33ae.firebasestorage.app",
    messagingSenderId: "753981072296",
    appId: "1:753981072296:web:a92cb922b52fcd1fabb39d",
    measurementId: "G-7YKLBE203D"
};
firebase.initializeApp(firebaseConfig);
const db = firebase.database();

// App State
let currentUser = null;
let users = [];
let requests = [];
let homeData = { title: "Welcome to Navithya", sub: "Your ultimate cloud-based solution for all home and IT services." };
let storeItems = [];

// Fetch realtime data
db.ref('users').on('value', (snapshot) => {
    const data = snapshot.val();
    users = data ? Object.values(data) : [];
    if (currentUser && currentUser.role === 'admin') updateAdminPanel();
});
db.ref('requests').on('value', (snapshot) => {
    const data = snapshot.val();
    requests = data ? Object.values(data) : [];
    if (currentUser && currentUser.role === 'admin') updateAdminPanel();
});
db.ref('homeData').on('value', (snapshot) => {
    if (snapshot.val()) {
        homeData = snapshot.val();
        document.getElementById('home-title-display').innerHTML = homeData.title;
        document.getElementById('home-sub-display').innerHTML = homeData.sub;
    }
});
db.ref('storeItems').on('value', (snapshot) => {
    if (snapshot.val()) {
        storeItems = Object.values(snapshot.val());
        renderStoreItems();
    }
});

// Constants
const ADMIN_USER = { username: 'ADITHYA', role: 'admin' };
const ADMIN_PASS = '19980307';
const WHATSAPP_NUM = '94769929453';

// DOM Elements
const authOverlay = document.getElementById('auth-overlay');
const appContainer = document.getElementById('app-container');

// Tabs setup
function switchAuthTab(tab) {
    const loginForm = document.getElementById('login-form');
    const signupForm = document.getElementById('signup-form');
    const btns = document.querySelectorAll('.tab-btn');

    if (tab === 'login') {
        loginForm.classList.remove('hidden');
        signupForm.classList.add('hidden');
        btns[0].classList.add('active');
        btns[1].classList.remove('active');
    } else {
        loginForm.classList.add('hidden');
        signupForm.classList.remove('hidden');
        btns[0].classList.remove('active');
        btns[1].classList.add('active');
    }
}

// Authentication
function handleLogin(e) {
    e.preventDefault();
    const username = document.getElementById('login-username').value;
    const pass = document.getElementById('login-password').value;

    if (username === ADMIN_USER.username && pass === ADMIN_PASS) {
        // Admin Login
        loginSuccess(ADMIN_USER);
        return;
    }

    // Normal Users
    const foundUser = users.find(u => u.phone === username || u.name === username);
    if (foundUser) {
        if (foundUser.pass !== pass) {
            alert('Invalid Password!');
            return;
        }
        if (foundUser.status === 'pending') {
            alert('Your account is pending admin approval.');
            return;
        }
        loginSuccess(foundUser);
    } else {
        alert('User not found. Please sign up.');
    }
}

function handleSignup(e) {
    e.preventDefault();
    const name = document.getElementById('signup-name').value;
    const phone = document.getElementById('signup-phone').value;
    const pass = document.getElementById('signup-password').value;
    const province = document.getElementById('signup-province').value;
    const district = document.getElementById('signup-district').value;

    const newUser = {
        id: Date.now(),
        name,
        phone,
        pass,
        province,
        district,
        role: 'unassigned',
        status: 'pending'
    };
    db.ref('users/' + newUser.id).set(newUser);

    // Send WhatsApp Alert to Admin
    const message = `New User Signup Pending Approval:\nName: ${name}\nPhone: ${phone}`;
    const waUrl = `https://wa.me/${WHATSAPP_NUM}?text=${encodeURIComponent(message)}`;
    window.open(waUrl, '_blank');

    alert('Signup successful! Please wait for Admin approval.');
    switchAuthTab('login');
}

// UI Control
function showAuthOverlay() {
    authOverlay.classList.remove('hidden');
}

function hideAuthOverlay() {
    authOverlay.classList.add('hidden');
}

function loginSuccess(user) {
    currentUser = user;
    authOverlay.classList.add('hidden');

    // UI toggles
    document.getElementById('nav-login-btn').classList.add('hidden');
    document.getElementById('nav-logout-btn').classList.remove('hidden');

    if (user.role === 'admin') {
        document.getElementById('admin-nav').classList.remove('hidden');
        updateAdminPanel();
    }

    alert(`Welcome to Navithya, ${user.name || user.username}!`);
}

function logout() {
    currentUser = null;

    // UI toggles
    document.getElementById('nav-login-btn').classList.remove('hidden');
    document.getElementById('nav-logout-btn').classList.add('hidden');
    document.getElementById('admin-nav').classList.add('hidden');

    // Clear forms
    document.getElementById('login-form').reset();
    document.getElementById('signup-form').reset();

    // Go back home if they are on a secured page
    navigate('home');
}

// Navigation
function navigate(pageId) {
    const pages = document.querySelectorAll('.page');
    pages.forEach(page => page.classList.add('hidden'));
    document.getElementById(`page-${pageId}`).classList.remove('hidden');

    if (pageId === 'admin' && (!currentUser || currentUser.role !== 'admin')) {
        alert('Access Denied. Admins Only.');
        navigate('home');
        return;
    }

    if (pageId === 'admin') {
        updateAdminPanel();

        // Populate current home info settings
        document.getElementById('admin-home-title').value = homeData.title;
        document.getElementById('admin-home-sub').value = homeData.sub;
    }
}

// Request Handling
function filterProviders() {
    const dist = document.getElementById('req-district').value;
    const serv = document.getElementById('req-service').value;

    const resultsDiv = document.getElementById('provider-results');
    const list = document.getElementById('provider-list');
    list.innerHTML = '';

    if (!serv) {
        resultsDiv.classList.add('hidden');
        return;
    }

    const matched = users.filter(u => {
        const isProvider = u.role === 'provider' && u.status === 'approved';
        const hasService = u.providerService === serv;
        const matchesDistrict = dist ? u.district === dist : true;
        return isProvider && hasService && matchesDistrict;
    });

    if (matched.length > 0) {
        matched.forEach(p => {
            const li = document.createElement('li');
            li.textContent = `✅ ${p.name} | 📞 ${p.phone}`;
            li.style.color = '#333';
            li.style.margin = '5px 0';
            list.appendChild(li);
        });
    } else {
        const li = document.createElement('li');
        li.textContent = "No verified providers available in this specific area yet. Our Navithya Team will reach out directly.";
        li.style.color = '#666';
        list.appendChild(li);
    }

    resultsDiv.classList.remove('hidden');
}

function handleServiceRequest(e) {
    e.preventDefault();
    if (!currentUser) {
        alert('You must be logged in to Request a Service!');
        showAuthOverlay();
        return;
    }

    const reqData = {
        id: Date.now(),
        district: document.getElementById('req-district').value,
        service: document.getElementById('req-service').value,
        desc: document.getElementById('req-desc').value,
        customerName: currentUser.name || currentUser.username,
        customerPhone: currentUser.phone || 'Admin',
        status: 'pending'
    };

    db.ref('requests/' + reqData.id).set(reqData);

    // Notify Admin via WhatsApp
    const message = `New Job Request on NAVITHYA:\nDistrict: ${reqData.district}\nService: ${reqData.service}\nDetails: ${reqData.desc}\nCustomer: ${reqData.customerName} (${reqData.customerPhone})`;
    const waUrl = `https://wa.me/${WHATSAPP_NUM}?text=${encodeURIComponent(message)}`;
    window.open(waUrl, '_blank');

    alert(`Request placed successfully! A WhatsApp notification was sent.`);
}

// Admin Panel Logic
function updateAdminPanel() {
    if (!currentUser || currentUser.role !== 'admin') return;

    document.getElementById('stat-users').innerText = users.length;
    document.getElementById('stat-requests').innerText = requests.length;

    const usersList = document.getElementById('admin-users-list');
    usersList.innerHTML = '';
    users.forEach(u => {
        const tr = document.createElement('tr');
        tr.style.borderBottom = '1px solid #eee';

        const approveBtn = u.status === 'pending' ? `<button onclick="adminSetUserStatus(${u.id}, 'approved')" style="background:green;color:white;padding:5px;border:none;cursor:pointer;">Approve</button>` : `<span style="color:green;">Approved</span>`;

        const roleSelect = `
            <select onchange="adminChangeRole(${u.id}, this.value)" style="padding:5px; margin-bottom: 5px; width: 100%;">
                <option value="unassigned" ${u.role === 'unassigned' ? 'selected' : ''}>Unassigned</option>
                <option value="customer" ${u.role === 'customer' ? 'selected' : ''}>Customer</option>
                <option value="provider" ${u.role === 'provider' ? 'selected' : ''}>Provider</option>
                <option value="developer" ${u.role === 'developer' ? 'selected' : ''}>Developer</option>
            </select>
            <br>
            <select onchange="adminChangeService(${u.id}, this.value)" style="padding:5px; width: 100%; display: ${u.role === 'provider' ? 'block' : 'none'};">
                <option value="" disabled ${!u.providerService ? 'selected' : ''}>Select Service Base</option>
                <option value="CCTV Installation" ${u.providerService === 'CCTV Installation' ? 'selected' : ''}>CCTV Installation</option>
                <option value="House Wiring" ${u.providerService === 'House Wiring' ? 'selected' : ''}>House Wiring</option>
                <option value="Computer Networking" ${u.providerService === 'Computer Networking' ? 'selected' : ''}>Computer Networking</option>
                <option value="Hardware" ${u.providerService === 'Hardware' ? 'selected' : ''}>Computer Hardware</option>
                <option value="Software" ${u.providerService === 'Software' ? 'selected' : ''}>Software</option>
                <option value="Plumbing" ${u.providerService === 'Plumbing' ? 'selected' : ''}>Plumbing</option>
                <option value="Solar System" ${u.providerService === 'Solar System' ? 'selected' : ''}>Solar</option>
                <option value="TV Radio Repair" ${u.providerService === 'TV Radio Repair' ? 'selected' : ''}>TV/Radio</option>
            </select>
        `;

        tr.innerHTML = `
            <td style="padding:10px;">${u.name}</td>
            <td style="padding:10px;">📞 ${u.phone}<br><small>🗺️ ${u.district || 'Any'}, ${u.province || ''}</small></td>
            <td style="padding:10px;">${u.status}</td>
            <td style="padding:10px; min-width:180px;">${roleSelect}</td>
            <td style="padding:10px;">${approveBtn}</td>
        `;
        usersList.appendChild(tr);
    });

    const reqsList = document.getElementById('admin-requests-list');
    reqsList.innerHTML = '';
    requests.slice().reverse().forEach(r => {
        const tr = document.createElement('tr');
        tr.style.borderBottom = '1px solid #eee';

        const actionBtn = r.status === 'pending' ? `<button onclick="adminAcceptRequest(${r.id})" style="background:#2979ff;color:white;padding:5px;border:none;cursor:pointer;">Accept Job</button>` : `<span style="color:green;">Accepted</span>`;

        tr.innerHTML = `
            <td style="padding:10px;">${new Date(r.id).toLocaleString()}</td>
            <td style="padding:10px;">${r.customerName}</td>
            <td style="padding:10px;">${r.service}</td>
            <td style="padding:10px;">${r.district}</td>
            <td style="padding:10px;">${r.status || 'pending'}</td>
            <td style="padding:10px;">${actionBtn}</td>
        `;
        reqsList.appendChild(tr);
    });
}

function adminSetUserStatus(id, status) {
    db.ref('users/' + id).update({ status: status });
    alert('User status updated');
}

function adminChangeRole(id, role) {
    db.ref('users/' + id).update({ role: role });
    alert('Role updated to ' + role);
}

function adminChangeService(id, service) {
    db.ref('users/' + id).update({ providerService: service });
    alert('Provider specialized service updated.');
}

function adminAcceptRequest(id) {
    db.ref('requests/' + id).update({ status: 'accepted' });
    alert('Job Accepted');
}

function adminUpdateHomeInfo(e) {
    e.preventDefault();
    const t = document.getElementById('admin-home-title').value;
    const s = document.getElementById('admin-home-sub').value;
    db.ref('homeData').set({ title: t, sub: s });
    alert('Home Info updated!');
}

function adminAddStoreItem(e) {
    e.preventDefault();
    const name = document.getElementById('admin-store-name').value;
    const desc = document.getElementById('admin-store-desc').value;
    const price = document.getElementById('admin-store-price').value;

    const newItem = { id: Date.now(), name, desc, price };
    db.ref('storeItems/' + newItem.id).set(newItem);
    alert('Store item added!');
    e.target.reset();
}

function renderStoreItems() {
    const grid = document.querySelector('.store-grid');
    if (!grid) return;
    grid.innerHTML = '';
    if (storeItems.length === 0) {
        grid.innerHTML = '<p>No items in store.</p>';
        return;
    }
    storeItems.forEach(item => {
        const div = document.createElement('div');
        div.className = 'store-item card';
        div.innerHTML = `
            <h3>${item.name}</h3>
            <p>${item.desc}</p>
            <span class="price">${item.price}</span>
            <button class="btn-outline">Buy Now</button>
        `;
        grid.appendChild(div);
    });
}


// The site is now open to viewing, login required for requesting tasks.
