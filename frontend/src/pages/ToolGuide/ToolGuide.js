import React, { useContext, useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import { Box, Button, Chip, Container, Divider, Grid, Paper, Stack, Tab, Tabs, Typography } from '@mui/material';
import LoginOutlinedIcon from '@mui/icons-material/LoginOutlined';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import PublicNav from '../../components/PublicNav';
import SectionHeader from '../../components/Layout/SectionHeader';
import UserContext from '../../UserContext';
import { tools, toolGroups } from '../../toolCatalog';

const ToolGuide = () => {
  const { isAuthenticated } = useContext(UserContext);
  const [group, setGroup] = useState('mvp');
  const visibleTools = tools.filter((tool) => tool.group === group);
  const [selectedSlug, setSelectedSlug] = useState(visibleTools[0].slug);
  const selectedTool = tools.find((tool) => tool.slug === selectedSlug) || visibleTools[0];
  const SelectedIcon = selectedTool.icon;

  const changeGroup = (event, nextGroup) => {
    setGroup(nextGroup);
    const nextTool = tools.find((tool) => tool.group === nextGroup);
    if (nextTool) setSelectedSlug(nextTool.slug);
  };

  return (
    <Box>
      {!isAuthenticated ? <PublicNav /> : null}
      <Box component="main" sx={{ py: { xs: 5, md: 7 } }}>
        <Container maxWidth="xl">
          <SectionHeader
            eyebrow="Interactive guide"
            title="Understand every Krypt tool before you use it"
            description="Browse how each workflow works, why it is useful, what makes it special, and where its limits are."
          />
          <Tabs value={group} onChange={changeGroup} sx={{ mb: 3 }}>
            {Object.entries(toolGroups).map(([key, value]) => (
              <Tab key={key} value={key} label={value.label} />
            ))}
          </Tabs>
          <Grid container spacing={3}>
            <Grid item xs={12} md={4}>
              <Stack spacing={1.5}>
                {visibleTools.map((tool) => {
                  const Icon = tool.icon;
                  const active = tool.slug === selectedTool.slug;
                  return (
                    <Paper
                      key={tool.slug}
                      elevation={0}
                      onClick={() => setSelectedSlug(tool.slug)}
                      sx={{
                        p: 2,
                        cursor: 'pointer',
                        borderColor: active ? tool.accent : 'divider',
                        bgcolor: active ? `${tool.accent}12` : 'background.paper',
                      }}
                    >
                      <Stack direction="row" spacing={1.5} alignItems="center">
                        <Box sx={{ color: tool.accent, display: 'grid', placeItems: 'center' }}><Icon /></Box>
                        <Box>
                          <Typography fontWeight={800}>{tool.name}</Typography>
                          <Typography variant="body2" color="text.secondary">{tool.detail}</Typography>
                        </Box>
                      </Stack>
                    </Paper>
                  );
                })}
              </Stack>
            </Grid>
            <Grid item xs={12} md={8}>
              <Paper elevation={0} sx={{ p: { xs: 2.5, md: 3 }, minHeight: 540 }}>
                <Stack spacing={3}>
                  <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} justifyContent="space-between">
                    <Stack direction="row" spacing={1.5} alignItems="center">
                      <Box sx={{ width: 58, height: 58, borderRadius: 2, display: 'grid', placeItems: 'center', bgcolor: `${selectedTool.accent}17`, color: selectedTool.accent, '& svg': { fontSize: 32 } }}>
                        <SelectedIcon />
                      </Box>
                      <Box>
                        <Chip size="small" label={toolGroups[selectedTool.group].label} sx={{ mb: 1 }} />
                        <Typography variant="h4">{selectedTool.name}</Typography>
                      </Box>
                    </Stack>
                    <Button
                      component={RouterLink}
                      to={isAuthenticated ? selectedTool.route : '/login'}
                      variant="contained"
                      startIcon={isAuthenticated ? null : <LoginOutlinedIcon />}
                      endIcon={isAuthenticated ? <ArrowForwardIcon /> : null}
                    >
                      {isAuthenticated ? 'Open tool' : 'Sign in to use'}
                    </Button>
                  </Stack>
                  <Typography color="text.secondary" sx={{ fontSize: 18, lineHeight: 1.7 }}>{selectedTool.description}</Typography>
                  <Divider />
                  {[
                    ['How to use it', selectedTool.howToUse],
                    ['Why it is useful', selectedTool.usefulFor],
                    ['What is special', selectedTool.special],
                    ['Limit', selectedTool.limitation],
                  ].map(([title, text]) => (
                    <Box key={title}>
                      <Typography variant="h6" sx={{ mb: 0.7 }}>{title}</Typography>
                      <Typography color="text.secondary" sx={{ lineHeight: 1.75 }}>{text}</Typography>
                    </Box>
                  ))}
                </Stack>
              </Paper>
            </Grid>
          </Grid>
        </Container>
      </Box>
    </Box>
  );
};

export default ToolGuide;
