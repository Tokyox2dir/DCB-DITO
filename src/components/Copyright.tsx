import Link from '@mui/material/Link'
import Typography from '@mui/material/Typography'

export default function Copyright(props: any) {
  return (
    <Typography
      variant='body2'
      align='left'
      {...props}
      sx={[
        {
          color: 'text.secondary',
        },
        ...(Array.isArray(props.sx) ? props.sx : [props.sx]),
      ]}
    >
      {'Copyright © '}
      <Link color='inherit' href='https://mui.com/'>
        Redision
      </Link>{' '}
      {new Date().getFullYear()}
      {'.'}
    </Typography>
  )
}
