const fs = require('fs');
const express = require('express');
const { Pool } = require('pg');
const bodyParser = require('body-parser');
const bcrypt = require('bcrypt');
const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const session = require('express-session');
const flash = require('connect-flash');
const path = require('path');
const winston = require('winston');
const https = require('https');

const app = express();
const port = 3001;

// Set up Winston logging
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' }),
  ],
});

// Error handling middleware
app.use((err, req, res, next) => {
  logger.error(err.stack);
  res.status(500).send('Something broke!');
});

app.use(express.static(path.join(__dirname, 'views')));

const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'WEB-fullstack',
  password: 'flarar22',
  port: 5432,
});

app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

app.use(session({
  secret: 'your-secret-key',
  resave: true,
  saveUninitialized: true
}));



app.use(flash());
app.use(passport.initialize());
app.use(passport.session());
app.use(express.static(__dirname ));

passport.serializeUser((user, done) => {
  done(null, user.id);
});

app.get('/users/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const user = await pool.query('SELECT * FROM users WHERE id = $1', [id]);
    if (user.rows.length === 0) {
      res.status(404).send('User not found');
    } else {
      res.json(user.rows[0]);
    }
  } catch (error) {
    logger.error(error);
    res.status(500).send('Internal Server Error');
  }
});


passport.deserializeUser(async (id, done) => {
  try {
    const user = await pool.query('SELECT * FROM users WHERE id = $1', [id]);
    done(null, user.rows[0]);
  } catch (error) {
    logger.error(error);
    done(error);
  }
});

passport.use('local-register', new LocalStrategy({
  usernameField: 'username',
  passwordField: 'password',
  passReqToCallback: true
}, async (req, username, password, done) => {
  try {
    // Check if the username is already taken
    const userExists = await pool.query('SELECT * FROM users WHERE username = $1', [username]);
    if (userExists.rows.length > 0) {
      return done(null, false, req.flash('registerMessage', 'Username already taken.'));
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Retrieve the role from the form data
    const role = req.body.role || 'user';

    // Insert user into the database with the selected role
    const query = 'INSERT INTO users (username, password, role) VALUES ($1, $2, $3) RETURNING *';
    const values = [username, hashedPassword, role];

    const result = await pool.query(query, values);
    const newUser = result.rows[0];

    return done(null, newUser);
  } catch (error) {
    logger.error(error);
    return done(error);
  }
}));


passport.use('local-login', new LocalStrategy({
  usernameField: 'username',
  passwordField: 'password',
  passReqToCallback: true
}, async (req, username, password, done) => {
  try {
    // Check if the user exists in the database
    const user = await pool.query('SELECT * FROM users WHERE username = $1', [username]);

    if (user.rows.length === 0) {
      // User not found
      return done(null, false, req.flash('loginMessage', 'Incorrect username or password.'));
    }

    // Check if the password is correct
    const passwordMatch = await bcrypt.compare(password, user.rows[0].password);

    if (!passwordMatch) {
      // Incorrect password
      return done(null, false, req.flash('loginMessage', 'Incorrect username or password.'));
    }

    // Successful login
    return done(null, user.rows[0]);

  } catch (error) {
    logger.error(error);
    return done(error);
  }
}));



const initializeDefaultUsers = async () => {
  try {
    const adminCheckQuery = 'SELECT * FROM users WHERE username = $1';
    const adminCheckValues = ['admin'];
    const adminResult = await pool.query(adminCheckQuery, adminCheckValues);

    if (adminResult.rows.length === 0) {
      const adminPassword = await bcrypt.hash('admin', 10);
      const adminInsertQuery = 'INSERT INTO users (username, email, password, role) VALUES ($1, $2, $3, $4)';
      const adminInsertValues = ['admin', 'admin@example.com', adminPassword, 'admin'];
      await pool.query(adminInsertQuery, adminInsertValues);
    }

    const modCheckQuery = 'SELECT * FROM users WHERE username = $1';
    const modCheckValues = ['mod'];
    const modResult = await pool.query(modCheckQuery, modCheckValues);

    if (modResult.rows.length === 0) {
      const modPassword = await bcrypt.hash('mod', 10);
      const modInsertQuery = 'INSERT INTO users (username, email, password, role) VALUES ($1, $2, $3, $4)';
      const modInsertValues = ['mod', 'mod@example.com', modPassword, 'moderator'];
      await pool.query(modInsertQuery, modInsertValues);
    }

    console.log('Default admin and moderator users created successfully.');
  } catch (error) {
    console.error('Error initializing default users:', error);
  }
};

initializeDefaultUsers();

// routes
// Registration route
app.post('/register', passport.authenticate('local-register', {
  successRedirect: '/dashboard',
  failureRedirect: '/register',
  failureFlash: true,
}));

app.get('/login', (req, res) => {
  res.sendFile(__dirname + '/login.html');
});

// Login route
app.post('/login', (req, res, next) => {
  console.log('Login request:', req.body.username, req.body.password);
  passport.authenticate('local-login', (err, user, info) => {
    if (err) {
      console.error(err);
      return next(err);
    }
    if (!user) {
      console.log('Login failed. Flash messages:', req.flash('loginMessage'));
      return res.redirect('/login');
    }
    req.logIn(user, (err) => {
      if (err) {
        console.error(err);
        return next(err);
      }
      console.log('Successful login, redirecting to /dashboard');
      const role = req.user.role;
      const username = req.user.username;
      const password = req.user.password;
      const sitePath = path.join(__dirname, `${role}_usr.html`);
      console.log('Successful login, user role:', role);
      console.log('File path:', sitePath);
      console.log('Username:', username);
      console.log('Password:', password);

      fs.access(sitePath, fs.constants.F_OK, (err) => {
        if (err) {
          console.error(`File not found: ${sitePath}`);
          return res.redirect('https://example.com');
        }

        // Send the user's name as part of the response
        res.sendFile(sitePath, { userName: req.user.name });
      });

    });
  })(req, res, next);
});

app.get('/dashboard', isAuthenticated, (req, res) => {
  const role = req.user.role;
  const sitePath = path.join(__dirname, `${role}_usr.html`);
  
  fs.access(sitePath, fs.constants.F_OK, (err) => {
    if (err) {
      console.error(`File not found: ${sitePath}`);
      res.redirect('https://example.com'); // Redirect to a default site
    } else {
      // Render the HTML file and pass the username as a variable
      res.render(sitePath, { username: req.user.username });
    }
  });
});


app.get('/logout', (req, res) => {
  req.logout();
  res.redirect('/');
});

app.post('/addUser', isAuthenticated, async (req, res) => {
  try {
    const { addUsername, addPassword } = req.body;

    const userExists = await pool.query('SELECT * FROM users WHERE username = $1', [addUsername]);
    if (userExists.rows.length > 0) {
      return res.status(400).send('Username already taken.');
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash(addPassword, 10);

    const query = 'INSERT INTO users (username, password, role) VALUES ($1, $2, $3) RETURNING *';
    const values = [addUsername, hashedPassword, 'user'];

    const result = await pool.query(query, values);
    const newUser = result.rows[0];

    res.redirect('/admin_dashboard.html');
  } catch (error) {
    logger.error(error);
    res.status(500).send('Internal Server Error');
  }
});

app.post('/deleteUser', isAuthenticated, async (req, res) => {
  try {
    const { deleteUsername, deletePassword } = req.body;

    const user = await pool.query('SELECT * FROM users WHERE username = $1', [deleteUsername]);

    if (user.rows.length === 0) {
      return res.status(400).send('User not found.');
    }

    const passwordMatch = await bcrypt.compare(deletePassword, user.rows[0].password);

    if (!passwordMatch) {
      return res.status(401).send('Incorrect password.');
    }

    await pool.query('DELETE FROM users WHERE username = $1', [deleteUsername]);

    res.redirect('/admin_dashboard.html');
  } catch (error) {
    logger.error(error);
    res.status(500).send('Internal Server Error');
  }
});

app.get('/admin_dashboard.html', isAuthenticated, (req, res) => {
  const role = req.user.role;
  const sitePath = path.join(__dirname,  `${role}_usr.html`);

  fs.access(sitePath, fs.constants.F_OK, (err) => {
    if (err) {
      console.error(`File not found: ${sitePath}`);
      res.redirect('https://example.com'); // Redirect to a default site
    } else {
      res.sendFile(sitePath);
    }
  });
});


app.get('/register.html', (req, res) => {
  res.sendFile(__dirname + '/register.html');
});

app.get('/login.html', (req, res) => {
  res.sendFile(__dirname + '/login.html');
});

app.get('/index.html', (req, res) => {
  res.sendFile(__dirname + '/index.html');
});

// -----------------------------------------------------------------
app.get('/books', isAuthenticated, async (req, res) => {
  try {
    // Fetch books from the database
    const books = await pool.query('SELECT * FROM books');

    // Render the 'books.ejs' template and pass the fetched books data
    res.render('books', { books: books.rows });
  } catch (error) {
    logger.error(error);
    res.status(500).send('Internal Server Error');
  }
});
// -----------------------------------------------------------------

app.get('/books_user', isAuthenticated, async (req, res) => {
  try {
    // Fetch books from the database
    const books = await pool.query('SELECT * FROM books');

    // Determine if the user is in the "user" role
    const isUser = req.user.role === 'user';

    // Render the appropriate template and pass the fetched books data
    if (isUser) {
      res.render('books_user', { books: books.rows });
    } else {
      res.render('books', { books: books.rows });
    }
  } catch (error) {
    logger.error(error);
    res.status(500).send('Internal Server Error');
  }
});



// Add a new book
app.post('/books', async (req, res) => {
  try {
    const { name, year, author, publisher, status, borrowed_by } = req.body;
   
    const query = 'INSERT INTO books (name, year, author, publisher, status, borrowed_by) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *';
    const values = [name, year, author, publisher, status, borrowed_by];
    
    const newBook = await pool.query(query, values);
    res.json(newBook.rows[0]);
  } catch (error) {
    logger.error(error);
    res.status(500).send('Internal Server Error');
  }
});


// Fetch a specific book by ID
app.get('/books/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const book = await pool.query('SELECT * FROM books WHERE id = $1', [id]);
    if (book.rows.length === 0) {
      res.status(404).send('Book not found');
    } else {
      res.json(book.rows[0]);
    }
  } catch (error) {
    logger.error(error);
    res.status(500).send('Internal Server Error');
  }
});


// Update a book
app.put('/books/:id', async (req, res) => {
  try {
    const { name, year, author, publisher, status, borrowed_by } = req.body;
    const { id } = req.params;
    const query = 'UPDATE books SET name = $1, year = $2, author = $3, publisher = $4, status = $5, borrowed_by = $6 WHERE id = $7 RETURNING *';
    const values = [name, year, author, publisher, status, borrowed_by, id];
    const updatedBook = await pool.query(query, values);
    res.json(updatedBook.rows[0]);
  } catch (error) {
    logger.error(error);
    res.status(500).send('Internal Server Error');
  }
});

// Borrow a book
app.post('/books/borrow/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { username } = req.user; // Assuming the user is authenticated and you have access to the username

    // Fetch the book by ID
    const book = await pool.query('SELECT * FROM books WHERE id = $1', [id]);
    if (book.rows.length === 0) {
      return res.status(404).send('Book not found');
    }

    // If the book is already borrowed, unborrow it; otherwise, borrow it
    const status = !book.rows[0].status;
    const borrowedBy = status ? username : null;

    // Update the book status and borrowed_by field
    const query = 'UPDATE books SET status = $1, borrowed_by = $2 WHERE id = $3 RETURNING *';
    const values = [status, borrowedBy, id];
    const updatedBook = await pool.query(query, values);

    res.json(updatedBook.rows[0]);
  } catch (error) {
    logger.error(error);
    res.status(500).send('Internal Server Error');
  }
});

// Unborrow a book
app.post('/books/unborrow/:id', isAuthenticated, async (req, res) => {
  try {
    const { id } = req.params;

    // Fetch the book by ID
    const book = await pool.query('SELECT * FROM books WHERE id = $1', [id]);
    if (book.rows.length === 0) {
      return res.status(404).send('Book not found');
    }

    // Check if the book is currently borrowed
    if (!book.rows[0].status) {
      return res.status(400).send('Book is not currently borrowed');
    }

    // Ensure that only the user who borrowed the book can unborrow it (except admin)
    if (req.user.role !== 'admin' && book.rows[0].borrowed_by !== req.user.username) {
      return res.status(403).send('You are not authorized to unborrow this book');
    }

    // Update the book status and borrowed_by field
    const query = 'UPDATE books SET status = $1, borrowed_by = $2 WHERE id = $3 RETURNING *';
    const values = [false, null, id];
    const updatedBook = await pool.query(query, values);

    res.json(updatedBook.rows[0]);
  } catch (error) {
    logger.error(error);
    res.status(500).send('Internal Server Error');
  }
});

// Delete a comment
app.delete('/books/:bookId/comments/:commentId', async (req, res) => {
  try {
    const { bookId, commentId } = req.params;
    
    // Check if the book exists (optional but recommended)
    const commentQuery = 'SELECT c.comment_id, u.username FROM comments c JOIN users u ON c.username = u.username WHERE c.book_id = $1 AND c.comment_id = $2';
    const commentResult = await pool.query(commentQuery, [bookId, commentId]);
    if (commentResult.rows.length === 0) {
      return res.status(404).send('Comment not found');
    }

    
    const commentUsername = commentResult.rows[0].username;
    const currentUsername = req.user.username; // Assuming you store username in req.user
    const role = req.user.role;

    // Check if the authenticated user is the owner of the comment or an admin
    if (commentUsername !== currentUsername && role !== 'admin') {
      return res.status(403).send('You are not authorized to delete this comment');
    }

    // Delete the comment
    const deleteQuery = 'DELETE FROM comments WHERE book_id = $1 AND comment_id = $2';
    await pool.query(deleteQuery, [bookId, commentId]);
    
    res.sendStatus(204); // No content
  } catch (error) {
    logger.error(error);
    res.status(500).send('Internal Server Error');
  }
});


// Route to fetch comments for a book
app.get('/books/:bookId/comments', async (req, res) => {
  try {
      const bookId = req.params.bookId;
      const comments = await pool.query('SELECT * FROM comments WHERE book_id = $1', [bookId]);
      res.json(comments.rows);
  } catch (error) {
      console.error('Error fetching comments:', error);
      res.status(500).json({ error: 'Failed to fetch comments' });
  }
});

// Route to add a new comment
app.post('/books/:bookId/comments', async (req, res) => {
  try {
      const { bookId } = req.params;
      const { userId, comment, username } = req.body;
      const query = 'INSERT INTO comments (book_id, user_id, comment, username) VALUES ($1, $2, $3, $4) RETURNING *';
      const values = [bookId, userId, comment, username];
      const newComment = await pool.query(query, values);
      res.status(201).json(newComment.rows[0]);
  } catch (error) {
      console.error('Error adding comment:', error);
      res.status(500).json({ error: 'Failed to add comment' });
  }
});


app.get('/borrowed-books',  async (req, res) => {
  try {
    const borrowedBooks = await pool.query('SELECT * FROM books WHERE borrowed_by = $1', [req.user.username]);
    
    res.json(borrowedBooks.rows);
  } catch (error) {
    logger.error(error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
});

app.get('/', (req, res) => {
  res.sendFile(__dirname + '/index.html');
});

function isAuthenticated(req, res, next) {
  if (req.isAuthenticated()) {
    const userRole = req.user.role;

    // Allow access based on user role
    switch (userRole) {
      case 'admin':
        console.log('Authenticated admin:', req.user);
        return next();
      case 'moderator':
        if (req.path === '/admin_usr.html') {
          console.log('Unauthorized access!');
          return res.redirect('/login');
        }
        console.log('Authenticated moderator:', req.user);
        return next();
      case 'user':
        // Allow access to books_user page for users with role 'user'
        if (req.path === '/books_user') {
          console.log('Authenticated user:', req.user);
          return next();
        }
        if (req.path.startsWith('/books/borrow') || req.path.startsWith('/books/unborrow')) {
          console.log('Authenticated user:', req.user);
          return next();
        }
        // Ensure that the user can only access their own page
        if (req.path !== `/${userRole}_usr.html`) {
          console.log('Unauthorized access!');
          return res.redirect('/login');
        }
        console.log('Authenticated user:', req.user);
        return next();
      default:
        console.log('Unauthorized access!');
        return res.redirect('/login');
    }
  }

  console.log('Not authenticated!');
  res.redirect('/login'); // Redirect to the login page if not authenticated
}

app.get('/moderator_usr.html', isAuthenticated, (req, res) => {
  const sitePath = path.join(__dirname, 'moderator_usr.html');

  fs.access(sitePath, fs.constants.F_OK, (err) => {
    if (err) {
      console.error(`File not found: ${sitePath}`);
      res.redirect('https://example.com'); // Redirect to a default site
    } else {
      res.sendFile(sitePath);
    }
  });
});

app.get('/user_usr.html', isAuthenticated, (req, res) => {
  const sitePath = path.join(__dirname, 'user_usr.html');

  fs.access(sitePath, fs.constants.F_OK, (err) => {
    if (err) {
      console.error(`File not found: ${sitePath}`);
      res.redirect('https://example.com'); // Redirect to a default site
    } else {
      res.sendFile(sitePath);
    }
  });
});



app.get('/admin_usr.html', isAuthenticated, (req, res) => {
  const role = req.user.role;
  const sitePath = path.join(__dirname, `${role}_usr.html`);

  fs.access(sitePath, fs.constants.F_OK, (err) => {
    if (err) {
      console.error(`File not found: ${sitePath}`);
      res.redirect('https://example.com'); // Redirect to a default site
    } else {
      res.sendFile(sitePath);
    }
  });
});

app.get('/user_name', (req, res) => {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ message: "User not authenticated" });
  }
  const username = req.user.username;

  res.json({ username: username });
});

app.post('/change-password',  async (req, res) => {
  try {
    const { oldPassword, newPassword } = req.body;

    const user = req.user;
    const passwordMatch = await bcrypt.compare(oldPassword, user.password);

    if (!passwordMatch) {
      return res.status(400).json({ message: 'Old password is incorrect' });
    }

    const hashedNewPassword = await bcrypt.hash(newPassword, 10);

    const updateQuery = 'UPDATE users SET password = $1 WHERE id = $2';
    await pool.query(updateQuery, [hashedNewPassword, user.id]);

    res.status(200).json({ message: 'Password updated successfully' });
  } catch (error) {
    logger.error(error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
});

app.get('/user_info',  (req, res) => {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ message: "User not authenticated" });
  }
  const username  = req.user.username;
  const userId = req.user.userId;
  const role = req.user.role;
  res.json({ username, userId, role });
  
});

app.post('/create_post',  async (req, res) => {
  try {
    const { content } = req.body;
    const userId = req.user.id;

    // Insert the new post into the database
    const query = 'INSERT INTO posts (user_id, content) VALUES ($1, $2) RETURNING *';
    const values = [userId, content];

    const newPost = await pool.query(query, values);

    res.status(201).json(newPost.rows[0]);
  } catch (error) {
    logger.error(error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
});

app.get('/user_posts',  async (req, res) => {
  try {
    const userId = req.user.id;

    // Fetch posts from the database based on the user ID
    const userPosts = await pool.query('SELECT * FROM posts WHERE user_id = $1', [userId]);

    // Send the fetched posts as a JSON response
    res.json(userPosts.rows);
  } catch (error) {
    logger.error(error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
});

// Delete a post
app.delete('/delete_post/:postId', async (req, res) => {
  try {
    const { postId } = req.params;
    
    // Check if the post exists
    const post = await pool.query('SELECT * FROM posts WHERE id = $1', [postId]);
    if (post.rows.length === 0) {
      return res.status(404).send('Post not found');
    }

    // Check if the authenticated user is the owner of the post or an admin
    const user = req.user; // Assuming you have user information stored in the request
    console.log(user.role, post.rows[0].user_id);
    if (user.role !== 'admin' && post.rows[0].user_id !== user.id) {
      return res.status(403).send('You are not authorized to delete this post');
    }

    // Delete the post from the database
    await pool.query('DELETE FROM posts WHERE id = $1', [postId]);
    console.log(user.role, post.rows[0].user_id);
    res.sendStatus(204); // No content
  } catch (error) {
    logger.error(error);
    res.status(500).send('Internal Server Error');
  }
});


// Fetch all user posts
app.get('/all_posts',  async (req, res) => {
  try {

    // Fetch all posts from the database
    const userPosts = await pool.query('SELECT * FROM posts');

    // Send the fetched posts as a JSON response
    res.json(userPosts.rows);
  } catch (error) {
    logger.error(error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
});

// Server Route to Render "all_user_posts.ejs"
app.get('/all_user_posts', isAuthenticated, async (req, res) => {
  try {
    // Fetch all user posts from the database
    const userPosts = await pool.query('SELECT * FROM posts');

    // Render the "all_user_posts.ejs" template with the userPosts data
    res.render('all_user_posts', { userPosts: userPosts.rows });
  } catch (error) {
    logger.error(error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  logger.error(err.stack);
  res.status(500).send('Something broke!');
});



app.listen(port, () => {
  logger.info(`Server is running on http://localhost:${port}`);
});