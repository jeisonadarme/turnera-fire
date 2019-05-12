import React from "react";
import "./App.css";

// Router
import { BrowserRouter as Router, Switch } from "react-router-dom";
import { Route } from "react-router-dom";
// Components
import Navbar from "./components/layout/Navbar";

// Pages
import home from "./pages/home";
import signup from "./pages/signup";

// MUI
import MuiThemeProvider from "@material-ui/core/styles/MuiThemeProvider";
import createMuiTheme from "@material-ui/core/styles/createMuiTheme";
import themeFile from "./util/theme";
const theme = createMuiTheme(themeFile);

function App() {
  return (
    <MuiThemeProvider theme={theme}>
      <Router>
        <Navbar />
        <div className="container">
          <Switch>
            <Route exact path="/" component={home} />
            <Route exact path="/signup" component={signup} />
          </Switch>
        </div>
      </Router>
    </MuiThemeProvider>
  );
}

export default App;
