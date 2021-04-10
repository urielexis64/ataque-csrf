const express = require("express");
const session = require("express-session");
const handlebars = require("express-handlebars");
const fs = require("fs");
const {response, request} = require("express");

const app = express();
const PORT = 4200;

// Middlewares
app.use(express.urlencoded({extended: true}));
app.use(
	session({
		secret: "test",
		resave: false,
		saveUninitialized: false,
	})
);
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

// DB
const users = JSON.parse(fs.readFileSync("./db.json"));

// Routes
app.get("/home", login, (req, res) => {
	res.send("home page, must be logged in to access");
});

app.get("/login", home, (req, res) => {
	res.render("login");
});

app.post("/login", (req, res) => {
	const {email, password} = req.body;

	if (!email || !password) {
		res.status(400).send("Fill all the fields");
	}

	const user = users.find((user) => user.email === email);
	if (!user || user.password !== password) {
		return res.status(400).send("Invalid credentials");
	}
	req.session.userId = user.id;
	console.log(req.session);
	res.redirect("/home");
});

app.get("/logout", login, (req, res) => {
	req.session.destroy();
	res.send("Logged out");
});

app.get("/edit", login, (req, res) => {
	res.render("edit");
});

app.post("/edit", login, (req, res) => {
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
