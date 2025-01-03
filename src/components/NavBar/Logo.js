import { Typography } from '@mui/material';
import React from 'react';

const Logo = () => {
  return (
    <Typography
      sx={{
        fontFamily: '"Pacifico", cursive',
        fontWeight: 300,
        fontSize: 30,
        fontStyle: 'normal',
        marginRight: 10,
      }}
    >
      Simply Schedule
    </Typography>
  );
};

export default Logo;
