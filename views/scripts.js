document.getElementById('addBookForm').addEventListener('submit', async (e) => {
    e.preventDefault();

    const name = document.getElementById('bookName').value;
    const year = document.querySelector('input[name="year"]').value;
    const author = document.querySelector('input[name="author"]').value;
    const publisher = document.querySelector('input[name="publisher"]').value;
    const status = document.querySelector('input[name="status"]').checked;
    const borrowedBy = document.getElementById('borrowedBy').value;

    // Validate name field
    if (!name) {
        document.getElementById('bookName').classList.add('is-invalid');
        return;
    }

    // Construct payload
    const payload = {
        name: name,
        year: year,
        author: author,
        publisher: publisher,
        status: status,
        borrowed_by: borrowedBy
    };

    try {
        const response = await fetch('/books', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json' // Specify content type as JSON
            },
            body: JSON.stringify(payload) // Convert payload to JSON string
        });
        
        if (response.ok) {
            window.location.reload(); // Refresh page to show updated book list
        } else {
            console.error('Failed to add book');
        }
    } catch (error) {
        console.error('Error:', error);
    }
});

// JavaScript to handle checkbox state change in "Add New Book" form
const statusCheckbox = document.getElementById('statusCheckbox');
const borrowedByRow = document.getElementById('borrowedByRow');

statusCheckbox.addEventListener('change', () => {
    if (statusCheckbox.checked) {
    borrowedByRow.style.display = 'table-row'; // Display the "Borrowed By" input field
    } else {
    borrowedByRow.style.display = 'none'; // Hide the "Borrowed By" input field
    }
});

// JavaScript to handle button clicks
document.querySelectorAll('.deleteButton').forEach(button => {
    button.addEventListener('click', async () => {
        const bookId = button.getAttribute('data-id');
        try {
            const response = await fetch(`/books/${bookId}`, {
                method: 'DELETE'
            });
            if (response.ok) {
                window.location.reload(); // Refresh page to show updated book list
            } else {
                console.error('Failed to delete book');
            }
        } catch (error) {
            console.error('Error:', error);
        }
    });
});

document.querySelectorAll('.editButton').forEach(button => {
    button.addEventListener('click', async () => {
    const bookId = button.getAttribute('data-id');
    try {
        // Fetch the book details by ID
        const response = await fetch(`/books/${bookId}`);
        if (response.ok) {
        const bookData = await response.json();
        // Populate the form with book details for editing
        document.getElementById('editBookForm').setAttribute('data-id', bookId);
        document.getElementById('editBookName').value = bookData.name;
        document.querySelector('input[name="editYear"]').value = bookData.year;
        document.querySelector('input[name="editAuthor"]').value = bookData.author;
        document.querySelector('input[name="editPublisher"]').value = bookData.publisher;
        document.querySelector('input[name="editStatus"]').checked = bookData.status;

        const editBorrowedByRow = document.getElementById('editBorrowedByRow');
        if (bookData.status) {
            editBorrowedByRow.style.display = 'table-row'; // Display the "Borrowed By" input field
            document.getElementById('editBorrowedBy').value = bookData.borrowed_by || '';
        } else {
            editBorrowedByRow.style.display = 'none'; // Hide the "Borrowed By" input field
            document.getElementById('editBorrowedBy').value = ''; // Clear the "Borrowed By" input field value
        }
        } else {
        console.error('Failed to fetch book details');
        }
    } catch (error) {
        console.error('Error:', error);
    }
    });
});

// JavaScript to handle checkbox state change in "Edit Book" form
const editStatusCheckbox = document.getElementById('editStatusCheckbox');
const editBorrowedByRow = document.getElementById('editBorrowedByRow');

editStatusCheckbox.addEventListener('change', () => {
    if (editStatusCheckbox.checked) {
    editBorrowedByRow.style.display = 'table-row'; // Display the "Borrowed By" input field
    } else {
    editBorrowedByRow.style.display = 'none'; // Hide the "Borrowed By" input field
    }
});

document.getElementById('editBookForm').addEventListener('submit', async (e) => {
    e.preventDefault();

    const bookId = document.getElementById('editBookForm').getAttribute('data-id');
    const name = document.getElementById('editBookName').value;
    const year = document.querySelector('input[name="editYear"]').value;
    const author = document.querySelector('input[name="editAuthor"]').value;
    const publisher = document.querySelector('input[name="editPublisher"]').value;
    const status = document.querySelector('input[name="editStatus"]').checked;
    const borrowedBy = document.getElementById('editBorrowedBy').value;

    const payload = {
    name: name,
    year: year,
    author: author,
    publisher: publisher,
    status: status,
    borrowed_by: borrowedBy
    };

    try {
    const response = await fetch(`/books/${bookId}`, {
        method: 'PUT',
        headers: {
        'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
    });

    if (response.ok) {
        window.location.reload(); // Refresh page to show updated book list
    } else {
        console.error('Failed to update book');
    }
    } catch (error) {
    console.error('Error:', error);
    }
});

// JavaScript to handle button clicks for borrowing
document.querySelectorAll('.borrowButton').forEach(button => {
button.addEventListener('click', async () => {
    console.log('Borrow button found:', button);
    const bookId = button.getAttribute('data-id');
    try {
        const response = await fetch(`/books/borrow/${bookId}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            }
        });
        if (response.ok) {
            window.location.reload(); // Refresh page to show updated book list
        } else {
            console.error('Failed to borrow book');
        }
    } catch (error) {
        console.error('Error:', error);
    }
});
});

// JavaScript to handle button clicks for unborrowing
document.querySelectorAll('.unborrowButton').forEach(button => {
button.addEventListener('click', async () => {
    const bookId = button.getAttribute('data-id');
    try {
        const response = await fetch(`/books/unborrow/${bookId}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            }
        });
        if (response.ok) {
            window.location.reload(); // Refresh page to show updated book list
        } else {
            console.error('Failed to unborrow book');
        }
    } catch (error) {
        console.error('Error:', error);
    }
});
});

// Event listener for the "View Comments" button
document.querySelectorAll('.viewCommentsButton').forEach(button => {
    button.addEventListener('click', async () => {
      const bookId = button.getAttribute('data-id');
      try {
        // Fetch comments for the specific book
        const response = await fetch(`/books/${bookId}/comments`);
        if (!response.ok) {
          throw new Error('Failed to fetch comments');
        }
        const comments = await response.json();
        
        // Clear previous comments
        const commentsList = document.getElementById('commentsList');
        commentsList.innerHTML = '';
        
        // Populate modal with fetched comments
        comments.forEach(comment => {
            const li = document.createElement('li');
            li.classList.add('list-group-item', 'd-flex', 'justify-content-between', 'align-items-center');
            li.innerHTML = `
            <span><strong>${comment.username}:</strong> ${comment.comment}</span>
            <button type="button" class="btn btn-danger btn-sm delete-comment" data-comment-id="${comment.comment_id}">Delete</button>
            `;
            commentsList.appendChild(li);
  
            // Add event listener to delete button
            const deleteButton = li.querySelector('.delete-comment');
            deleteButton.addEventListener('click', async () => {
              const commentId = deleteButton.getAttribute('data-comment-id');
              console.log(commentId);
              try {
                // Delete the comment
                const deleteResponse = await fetch(`/books/${bookId}/comments/${commentId}`, {
                  method: 'DELETE'
                });
                if (!deleteResponse.ok) {
                  throw new Error('Failed to delete comment');
                }
                // Remove the comment from the UI
                li.remove();
              } catch (error) {
                console.error('Error deleting comment:', error);
              }
            });
        });
  
      } catch (error) {
        console.error('Error fetching comments:', error);
      }
    });
  });
  


document.getElementById('addCommentForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    // Fetch user info
    try {
        const userInfoResponse = await fetch('/user_info');
        if (!userInfoResponse.ok) {
            throw new Error('Failed to fetch user info');
        }
        const userInfo = await userInfoResponse.json();
        const userId = userInfo.userID;
        const username = userInfo.username;

        // Proceed with adding the comment
        const bookId = document.querySelector('.viewCommentsButton').getAttribute('data-id');
        const comment = document.getElementById('commentText').value;

        const commentPayload = {
            userId: userId,
            username: username,
            comment: comment
        };
        console.log(commentPayload);

        try {
            const response = await fetch(`/books/${bookId}/comments`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(commentPayload)
            });
            if (response.ok) {
                // Reload comments after adding a new one
                document.querySelector('.viewCommentsButton[data-id="' + bookId + '"]').click();
                document.getElementById('commentText').value = ''; // Clear the input field
            } else {
                console.error('Failed to add comment');
            }
        } catch (error) {
            console.error('Error:', error);
        }
    } catch (error) {
        console.error('Error:', error);
    }
});


async function userIsCommentAuthor(username, commentId) {
    try {
      // Fetch the comment from the database
      const comment = await pool.query('SELECT username FROM comments WHERE id = $1', [commentId]);
  
      // Check if the comment exists and if its author's username matches the given username
      return comment.rows.length > 0 && comment.rows[0].username === username;
    } catch (error) {
      console.error('Error checking comment author:', error);
      // Return false if an error occurs (for safety)
      return false;
    }
}
  

fetch('/all_posts')
  .then(response => response.json())
  .then(posts => {
    const userPostsContainer = document.getElementById('userPosts');
    userPostsContainer.innerHTML = ''; // Clear previous content

    posts.forEach(post => {
      const card = document.createElement('div');
      card.classList.add('card', 'mb-3');

      const cardBody = document.createElement('div');
      cardBody.classList.add('card-body');

      const content = document.createElement('p');
      content.classList.add('card-text');
      content.textContent = post.content;

      const createdAt = document.createElement('p');
      createdAt.classList.add('card-text', 'text-muted');
      createdAt.textContent = 'Created at ' + new Date(post.created_at).toLocaleString();

      const deleteButton = document.createElement('button');
      deleteButton.classList.add('btn', 'btn-danger', 'delete-post');
      deleteButton.dataset.postId = post.id;
      deleteButton.textContent = 'Delete';

      deleteButton.addEventListener('click', function() {
        const postId = this.dataset.postId;
        fetch(`/delete_post/${postId}`, {
          method: 'DELETE'
        })
        .then(response => response.json())
        .then(data => {
          // Refresh the posts after deletion
          fetchPosts();
        })
        .catch(error => {
          console.error('Error:', error);
        });
      });

      cardBody.appendChild(content);
      cardBody.appendChild(createdAt);
      cardBody.appendChild(deleteButton);
      card.appendChild(cardBody);
      userPostsContainer.appendChild(card);
    });
  })
  .catch(error => {
    console.error('Error fetching user posts:', error);
  });

// Function to fetch user posts
function fetchPosts() {
  fetch('/all_posts')
    .then(response => response.json())
    .then(posts => {
      const userPostsContainer = document.getElementById('userPosts');
      userPostsContainer.innerHTML = ''; // Clear previous content

      posts.forEach(post => {
        const card = document.createElement('div');
        card.classList.add('card', 'mb-3');

        const cardBody = document.createElement('div');
        cardBody.classList.add('card-body');

        const content = document.createElement('p');
        content.classList.add('card-text');
        content.textContent = post.content;

        const createdAt = document.createElement('p');
        createdAt.classList.add('card-text', 'text-muted');
        createdAt.textContent = 'Created at ' + new Date(post.created_at).toLocaleString();

        const deleteButton = document.createElement('button');
        deleteButton.classList.add('btn', 'btn-danger', 'delete-post');
        deleteButton.dataset.postId = post.id;
        deleteButton.textContent = 'Delete';

        deleteButton.addEventListener('click', function() {
          const postId = this.dataset.postId;
          fetch(`/delete_post/${postId}`, {
            method: 'DELETE'
          })
          .then(response => response.json())
          .then(data => {
            // Refresh the posts after deletion
            fetchPosts();
          })
          .catch(error => {
            console.error('Error:', error);
          });
        });

        cardBody.appendChild(content);
        cardBody.appendChild(createdAt);
        cardBody.appendChild(deleteButton);
        card.appendChild(cardBody);
        userPostsContainer.appendChild(card);
      });
    })
    .catch(error => {
      console.error('Error fetching user posts:', error);
    });
}
