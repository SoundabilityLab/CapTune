import React from "react";
import {
  Container,
  Typography,
  Box,
  Paper,
  Link as MuiLink,
  AppBar,
  Toolbar,
} from "@mui/material";
import Head from "next/head";
import AdapterPage from "@/components/AdapterPage";

export default function Home() {
  return (
    <>
      <Head>
        <title>CAPTUNE | Viewer</title>
        <meta name="description" content="Customized captions for Deaf and Hard of Hearing viewers" />
      </Head>

      <AppBar position="sticky" color="default" elevation={0} sx={{ backgroundColor: 'blue.200', mb: 4 }}>
        <Toolbar>
          <Typography variant="h5" component="h1" fontWeight={600}>
            CAPTUNE | Viewer
          </Typography>
        </Toolbar>
      </AppBar>

      <AdapterPage />

      <Box component="footer" sx={{ mt: 8, py: 3, bgcolor: 'grey.100' }}>
        <Container maxWidth="xl">
          <Typography variant="body2" color="text.secondary" align="center">
            AdaptiveCaptions Viewer
          </Typography>
          <Typography variant="body2" color="text.secondary" align="center">
            © {new Date().getFullYear()} Soundability Lab, University of Michigan
          </Typography>
        </Container>
      </Box>
    </>
  );
}
