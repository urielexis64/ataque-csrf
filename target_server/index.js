const express = require("express");
const session = require("express-session");
const flash = require("connect-flash-plus");
const handlebars = require("express-handlebars");
const fs = require("fs");
const {v4: uuid} = require("uuid");
const cors = require("cors");
const {response, request} = require("express");

const app = express();
const PORT = 4200;

// Middlewares

// CORS permite establecer el header "Access-Control-Allow-Origin: *" que
// permite ver las respuestas de peticiones a servidores externos siempre
// y cuando NO se incluyan las credenciales (credentials: "include")

// ! El siguiente código SÍ dejaría acceder al atacante ya qe daría acceso
// ! a las credenciales y a mostrar la respuesta de la petición

/* app.use(
	cors({
		origin: "http://localhost:5000",
		credentials: true,
	})
); */

app.use(express.urlencoded({extended: true}));
app.use(
	session({
		secret: "test",
		resave: false,
		saveUninitialized: false,
	})
);

app.use(flash());
app.set("views", __dirname);
app.engine(
	"hbs",
	handlebars({
		defaultLayout: "main",
		layoutsDir: __dirname,
		extname: ".hbs",
	})
);

app.set("view engine", "hbs");

// Login
const login = (req = request, res = response, next) => {
	if (!req.session.userId) {
		return res.redirect("/login");
	} else {
		next();
	}
};
const home = (req = request, res = response, next) => {
	if (req.session.userId) {
		return res.redirect("/home");
	} else {
		next();
	}
};

// CSRF
const tokens = new Map();

const csrfToken = (sessionId) => {
	const token = uuid();
	tokens.get(sessionId).add(token);
	// token expires each hour
	setTimeout(() => tokens.get(sessionId).delete(token), 60 * 60_000);
	return token;
};

const csrf = (req, res, next) => {
	const token = req.body.csrf;
	if (!token || !tokens.get(req.sessionID).has(token)) {
		res.status(422).send("CSRF Token missing or expired");
	} else {
		next();
	}
};

// DB
const users = JSON.parse(fs.readFileSync("./db.json"));

// Routes
app.get("/home", login, (req, res) => {
	res.send("home page, must be logged in to access");
});

app.get("/login", home, (req, res) => {
	console.log(req.session);
	res.render("login", {message: req.flash("message")});
});

app.post("/login", (req, res) => {
	const {email, password} = req.body;

	if (!email || !password) {
		req.flash("message", "Fill all the fields");
		res.redirect("/login");
	}

	const user = users.find((user) => user.email === email);

	if (!user || user.password !== password) {
		req.flash("message", "Invalid credentials");
		return res.redirect("/login");
	}

	req.session.userId = user.id;
	tokens.set(req.sessionID, new Set());
	console.log(req.session);
	res.redirect("/home");
});

app.get("/logout", login, (req, res) => {
	req.session.destroy();
	res.send("Logged out");
});

app.get("/edit", login, (req, res) => {
	res.render("edit", {token: csrfToken(req.sessionID)});
});

app.post("/edit", login, csrf, (req, res) => {
	const user = users.find((user) => user.id === req.session.userId);
	user.email = req.body.email;
	fs.writeFileSync("./db.json", JSON.stringify([user]));
	console.log(`User ${user.id} email changed to ${user.email}`);
	res.send(`email changed to ${user.email}`);
});

// Server
app.listen(PORT, () => {
	console.log(`Listening on http://localhost:${PORT}`);
});
