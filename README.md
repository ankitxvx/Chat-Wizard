 

# Chat Wizard 💬

A real-time messaging application built using the **MERN stack** (MongoDB, Express.js, React.js, Node.js) that allows users to communicate instantly. The app includes features such as user authentication, real-time messaging with WebSockets, and a sleek user interface styled with **Tailwind CSS**.

## Features
- **Real-time Messaging**: Users can send and receive messages instantly using WebSockets.
- **User Authentication**: Secure login and registration with JWT-based authentication.
- **Responsive UI**: Built with Tailwind CSS, the app works seamlessly across different devices.
- **Profile Management**: Users can manage their profile information.
- **WebSocket Integration**: For real-time communication between users.

## Tech Stack
- **Frontend**: React.js, Tailwind CSS
- **Backend**: Node.js, Express.js
- **Database**: MongoDB
- **Real-time Communication**: Socket.io (WebSockets)
- **Authentication**: JWT (JSON Web Token)

## Prerequisites
Before running the project, ensure you have the following installed:
- **Node.js** (v14+)
- **MongoDB** (local or MongoDB Atlas)

## Getting Started

### 1. Clone the Repository
```bash
git clone https://github.com/ankitxvx/Chat-Wizard.git
cd Chat-Wizard
```

### 2. Install Dependencies

#### Backend
Navigate to the `server` directory and install the required dependencies:

```bash
cd server
npm install
```

#### Frontend
Next, install dependencies for the React frontend:

```bash
cd client
npm install
```

### 3. Set Up Environment Variables

In the `server` directory, create a `.env` file with the following variables:

```
MONGO_URI=your_mongo_db_uri
JWT_SECRET=your_jwt_secret
```

### 4. Run the Application

Start both the client and server:

#### Start the Server:
```bash
cd server
npm start
```

#### Start the Client:
```bash
cd client
npm run dev
```

Now, visit `http://localhost:3000` in your browser to see the app running!

## Screenshots
Add some screenshots or a video here to showcase the design and functionality of the app.

## API Endpoints

### Authentication
- **POST /auth/register**: Register a new user
- **POST /auth/login**: Login a user and return JWT

### Messages
- **POST /messages**: Send a new message
- **GET /messages/:conversationId**: Get all messages for a particular conversation

### WebSocket Events
- **connect**: User connects to the socket
- **message**: Send and receive real-time messages
- **disconnect**: Handle user disconnection

## Future Enhancements
- **Group Chat**: Add support for multiple users in a single conversation.
- **Message History**: Store and retrieve past messages.
- **Push Notifications**: Enable push notifications for new messages.
- **Typing Indicators**: Show when a user is typing.

## Contributing
Contributions are welcome! Feel free to fork this repository and submit a pull request if you'd like to improve the app.
 

---

Feel free to adjust the details or add anything specific to your project!
 
 ScreenShots:
<img width="960" alt="image" src="https://github.com/ankitxvx/Chat-Wizard/assets/90975195/4ec4a21f-0065-48ec-802e-ee0926304b5b">
<img width="960" alt="image" src="https://github.com/ankitxvx/Chat-Wizard/assets/90975195/ae785b2d-deba-4006-ab57-46a6216ea35d">
<img width="960" alt="image" src="https://github.com/ankitxvx/Chat-Wizard/assets/90975195/35a7c958-4de4-472f-8d7d-f92874f25214">
