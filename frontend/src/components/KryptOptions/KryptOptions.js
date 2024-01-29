import React from "react";
import { Link, useNavigate } from "react-router-dom";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Typography from "@mui/material/Typography";
import Grid from "@mui/material/Grid";
import TextsmsIcon from "@mui/icons-material/Textsms";
import ImageSearchIcon from "@mui/icons-material/ImageSearch";
import QrCodeIcon from "@mui/icons-material/QrCode";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import { useTheme } from "@mui/material/styles";
import useMediaQuery from "@mui/material/useMediaQuery";

const KryptOption = () => {
  const theme = useTheme();
  const navigate = useNavigate();

  const choices = [
    {
      name: "textToText",
      link: "",
      description: "Convert text to another text format.Convert text to another text format.Convert text to another text format.",
      icon: <TextsmsIcon fontSize="large" />,
    },
    {
      name: "steganoGraphy",
      link: "",
      description: "Hide information within an image.Hide information within an image.Hide information within an image.",
      icon: <ImageSearchIcon fontSize="large" />,
    },
    {
      name: "qrCode",
      link: "",
      description: "Generate and scan QR codes.Generate and scan QR codes.Generate and scan QR codes.",
      icon: <QrCodeIcon fontSize="large" />,
    },
  ];

  const cardContainerStyle = {
    display: 'flex',
    justifyContent: 'center',
    padding: "50px",
  };

  const cardStyle = {
    width: '90%',
    height: '100%',
    display: "flex",
    flexDirection: "column",
    justifyContent: "space-between",
    borderRadius: "10px",
    boxShadow: "0 4px 8px rgba(0, 0, 0, 0.1)",
    transition: "transform 0.3s ease-in-out",
    cursor: "pointer",
    "&:hover": {
      transform: "scale(1.05)",
    },
  };

  const iconStyle = {
    margin: "0 auto",
    color: "#3f51b5",
    paddingTop: "20px",
  };

  const navigateToLink = (link) => {
    navigate(link)
    console.log(`Navigating to: ${link}`);
  };

  // Use MUI's useMediaQuery to determine the screen size
  const isSmScreen = useMediaQuery(theme.breakpoints.down("sm"));

  return (
    <Grid container spacing={2} style={cardContainerStyle}>
      {choices.map((choice, ind) => (
        <Grid item xs={12} sm={isSmScreen ? 12 : 6} md={4} key={ind}>
          <Card
            style={cardStyle}
            onClick={() => navigateToLink(`/krypt/${choice.name}`)}
          >
            <CardContent style={{ textAlign: 'center' }}>
              {choice.icon && <div style={iconStyle}>{choice.icon}</div>}
            <br/>
            <Typography variant="h5" component="div">
            {choice.name.charAt(0).toUpperCase() + choice.name.slice(1)}
            </Typography>

              <br/>
              <Typography variant="body2" color="text.secondary">
                {choice.description}
              </Typography>
            </CardContent>
            <ArrowForwardIcon style={{ margin: "0 auto", color: "#3f51b5" }} />
          </Card>
        </Grid>
      ))}
    </Grid>
  );
};

export default KryptOption;
