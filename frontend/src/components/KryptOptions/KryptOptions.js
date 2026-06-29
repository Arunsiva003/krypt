import React from "react";
import { useNavigate } from "react-router-dom";
import {
  Box,
  Card,
  CardActionArea,
  CardContent,
  Chip,
  Container,
  Grid,
  Stack,
  Typography,
} from "@mui/material";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import SectionHeader from "../Layout/SectionHeader";
import { labTools, mvpTools, secondaryTools } from "../../toolCatalog";

const KryptOption = () => {
  const navigate = useNavigate();

  return (
    <Box id="tools" component="section" sx={{ py: { xs: 5, md: 7 } }}>
      <Container maxWidth="xl">
        <SectionHeader eyebrow="Tool suite" title="Choose a workflow" description="Core tools stay prominent, while secondary and Labs tools are grouped for easy scanning." />
        <SectionHeader eyebrow="MVP" title="Core workflows" description="The existing Krypt workflows remain the primary product surface." sx={{ mb: 2 }} />
        <Grid container spacing={2.5}>
          {mvpTools.map((choice) => {
            const Icon = choice.icon;
            return (
            <Grid item xs={12} sm={6} lg={3} key={choice.name}>
              <Card
                sx={{
                  height: '100%',
                  overflow: 'hidden',
                  transition: 'transform 180ms ease, box-shadow 180ms ease, border-color 180ms ease',
                  '&:hover': {
                    transform: 'translateY(-4px)',
                    boxShadow: 6,
                    borderColor: choice.accent,
                  },
                }}
              >
                <CardActionArea onClick={() => navigate(choice.route)} sx={{ height: '100%' }}>
                  <CardContent sx={{ minHeight: 318, height: '100%', display: 'flex', flexDirection: 'column', gap: 2.2, textAlign: 'left' }}>
                    <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                      <Box
                        sx={{
                          width: 52,
                          height: 52,
                          display: 'grid',
                          placeItems: 'center',
                          borderRadius: 2,
                          bgcolor: `${choice.accent}17`,
                          color: choice.accent,
                          '& svg': { fontSize: 28 },
                        }}
                      >
                          <Icon />
                      </Box>
                      <Chip size="small" label={choice.detail} sx={{ bgcolor: 'action.hover' }} />
                    </Stack>
                    <Box>
                      <Typography variant="h5" sx={{ mb: 1 }}>
                        {choice.name}
                      </Typography>
                      <Typography color="text.secondary" sx={{ lineHeight: 1.65 }}>
                        {choice.description}
                      </Typography>
                    </Box>
                    <Box sx={{ flexGrow: 1 }} />
                    <Box
                      component="span"
                      sx={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 0.75,
                        alignSelf: 'flex-start',
                        color: choice.accent,
                        px: 0,
                        fontWeight: 750,
                      }}
                    >
                      Open workflow
                      <ArrowForwardIcon fontSize="small" />
                    </Box>
                  </CardContent>
                </CardActionArea>
              </Card>
            </Grid>
          )})}
        </Grid>
        <SectionHeader eyebrow="Secondary" title="Practical security helpers" description="Useful tools for file privacy, integrity checks, notes, and cleanup." sx={{ mt: 6, mb: 2 }} />
        <Grid container spacing={2.5}>
          {secondaryTools.map((choice) => {
            const Icon = choice.icon;
            return (
              <Grid item xs={12} sm={6} lg={4} key={choice.name}>
                <Card sx={{ height: '100%', overflow: 'hidden', transition: 'transform 180ms ease, box-shadow 180ms ease, border-color 180ms ease', '&:hover': { transform: 'translateY(-4px)', boxShadow: 6, borderColor: choice.accent } }}>
                  <CardActionArea onClick={() => navigate(choice.route)} sx={{ height: '100%' }}>
                    <CardContent sx={{ minHeight: 250, height: '100%', display: 'flex', flexDirection: 'column', gap: 2, textAlign: 'left' }}>
                      <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                        <Box sx={{ width: 48, height: 48, display: 'grid', placeItems: 'center', borderRadius: 2, bgcolor: `${choice.accent}17`, color: choice.accent, '& svg': { fontSize: 26 } }}><Icon /></Box>
                        <Chip size="small" label={choice.detail} sx={{ bgcolor: 'action.hover' }} />
                      </Stack>
                      <Box>
                        <Typography variant="h5" sx={{ mb: 1 }}>{choice.name}</Typography>
                        <Typography color="text.secondary" sx={{ lineHeight: 1.65 }}>{choice.description}</Typography>
                      </Box>
                      <Box sx={{ flexGrow: 1 }} />
                      <Box component="span" sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.75, alignSelf: 'flex-start', color: choice.accent, px: 0, fontWeight: 750 }}>Open workflow<ArrowForwardIcon fontSize="small" /></Box>
                    </CardContent>
                  </CardActionArea>
                </Card>
              </Grid>
            );
          })}
        </Grid>
        <SectionHeader eyebrow="Labs" title="Experimental privacy workflows" description="Out-of-the-box tools that make Krypt more memorable." sx={{ mt: 6, mb: 2 }} />
        <Grid container spacing={2.5}>
          {labTools.map((choice) => {
            const Icon = choice.icon;
            return (
              <Grid item xs={12} md={4} key={choice.name}>
                <Card sx={{ height: '100%', overflow: 'hidden', transition: 'transform 180ms ease, box-shadow 180ms ease, border-color 180ms ease', '&:hover': { transform: 'translateY(-4px)', boxShadow: 6, borderColor: choice.accent } }}>
                  <CardActionArea onClick={() => navigate(choice.route)} sx={{ height: '100%' }}>
                    <CardContent sx={{ minHeight: 250, height: '100%', display: 'flex', flexDirection: 'column', gap: 2, textAlign: 'left' }}>
                      <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                        <Box sx={{ width: 48, height: 48, display: 'grid', placeItems: 'center', borderRadius: 2, bgcolor: `${choice.accent}17`, color: choice.accent, '& svg': { fontSize: 26 } }}><Icon /></Box>
                        <Chip size="small" label={choice.detail} sx={{ bgcolor: 'action.hover' }} />
                      </Stack>
                      <Box>
                        <Typography variant="h5" sx={{ mb: 1 }}>{choice.name}</Typography>
                        <Typography color="text.secondary" sx={{ lineHeight: 1.65 }}>{choice.description}</Typography>
                      </Box>
                      <Box sx={{ flexGrow: 1 }} />
                      <Box component="span" sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.75, alignSelf: 'flex-start', color: choice.accent, px: 0, fontWeight: 750 }}>Open workflow<ArrowForwardIcon fontSize="small" /></Box>
                    </CardContent>
                  </CardActionArea>
                </Card>
              </Grid>
            );
          })}
        </Grid>
      </Container>
    </Box>
  );
};

export default KryptOption;
