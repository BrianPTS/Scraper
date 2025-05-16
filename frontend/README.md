# React + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react/README.md) uses [Babel](https://babeljs.io/) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

# Scraper Frontend

## Development Environment Setup

### API URL Configuration

This application is designed to work both locally and in a cloud environment without code changes. 

- **Local Development**: Uses the value from `VITE_API_URL` environment variable (set to `http://localhost:3000` by default)
- **Production**: Uses relative URLs that work with nginx in the cloud setup

### Local Development

1. Ensure you have the correct `.env` file with:
   ```
   VITE_API_URL="http://localhost:3000"
   ```

2. Run the development server:
   ```
   npm run dev
   ```

### Production Deployment

For production, the `VITE_API_URL` should be empty or not defined, allowing the app to use relative URLs that work with the nginx configuration.
