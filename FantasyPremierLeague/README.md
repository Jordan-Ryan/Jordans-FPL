# Fantasy Premier League App

A modern, feature-rich React Native mobile application for Fantasy Premier League (FPL) management, built with Expo and TypeScript.

## 🚀 Features

### 📱 Core Functionality
- **Player Management**: Browse and analyze all FPL players with detailed statistics
- **Squad Builder**: Create and manage your fantasy team with intuitive drag-and-drop interface
- **Fixtures View**: Comprehensive fixture list with team information and difficulty ratings
- **Points Tracking**: Monitor your team's performance and points accumulation
- **Real-time Data**: Live updates from the official FPL API

### 🎨 User Experience
- **Modern UI**: Clean, intuitive interface built with Tailwind CSS
- **Responsive Design**: Optimized for all iOS device sizes
- **Smooth Navigation**: Seamless transitions between screens
- **Dark/Light Theme**: Customizable appearance with theme switching

### 🔧 Technical Features
- **TypeScript**: Full type safety and better development experience
- **React Navigation**: Smooth navigation between app sections
- **State Management**: Efficient data handling and caching
- **API Integration**: Direct connection to official FPL endpoints

## 📱 Screenshots

The app includes several key screens:
- **Players Screen**: Browse all FPL players with filtering and search
- **Fixtures Screen**: View upcoming and past fixtures
- **Points Screen**: Track your team's performance
- **Squad Manager**: Build and manage your fantasy team

## 🛠️ Technology Stack

- **Frontend**: React Native with Expo
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Navigation**: React Navigation
- **State Management**: React Context API
- **API**: Direct FPL API integration
- **Platform**: iOS (with Android support ready)

## 📋 Prerequisites

- Node.js (v18 or higher)
- npm or yarn
- Expo CLI
- iOS Simulator or physical iOS device
- Xcode (for iOS development)

## 🚀 Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/Jordan-Ryan/Jordans-FPL.git
   cd Jordans-FPL
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start the development server**
   ```bash
   npx expo start
   ```

4. **Run on iOS**
   ```bash
   npx expo run:ios
   ```

## 🏗️ Project Structure

```
src/
├── components/          # Reusable UI components
├── screens/            # Main app screens
├── context/            # React Context providers
├── data/               # Static data and API services
├── services/           # External API integrations
├── styles/             # Component styling
├── types/              # TypeScript type definitions
└── utils/              # Helper functions
```

## 🔌 API Integration

The app integrates directly with the official Fantasy Premier League API:
- **Bootstrap Data**: Player information, teams, and gameweek data
- **Live Updates**: Real-time fixture results and player performance
- **Team Management**: Squad building and transfer functionality

## 🎯 Key Components

- **PlayerDetailsModal**: Comprehensive player information display
- **SquadManager**: Interactive team management interface
- **PlayerPhoto**: Dynamic player image handling with fallbacks
- **Navigation**: Bottom tab navigation with stack navigation

## 🚀 Development

### Running in Development Mode
```bash
npx expo start
```

### Building for Production
```bash
npx expo run:ios --configuration Release
```

### Testing on Device
```bash
npx expo run:ios --device
```

## 📱 Deployment

The app is configured for both development and production builds:
- **Development**: Metro bundler with hot reloading
- **Production**: Standalone iOS app with bundled JavaScript

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **FPL API**: Official Fantasy Premier League data
- **Expo Team**: React Native development platform
- **React Native Community**: Open source contributions
- **Tailwind CSS**: Utility-first CSS framework

## 📞 Support

For support or questions, please open an issue on GitHub or contact the development team.

---

**Built with ❤️ for Fantasy Premier League enthusiasts** 