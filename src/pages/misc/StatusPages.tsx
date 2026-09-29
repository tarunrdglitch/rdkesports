import { Link } from 'react-router-dom'
const Box=({code,title,text}:{code:string;title:string;text:string})=>(<div className="flex min-h-screen flex-col items-center justify-center gap-2 p-6 text-center"><p className="text-6xl font-extrabold text-muted-foreground">{code}</p><h1 className="text-xl font-bold">{title}</h1><p className="text-muted-foreground">{text}</p><Link to="/" className="mt-3 text-primary">Go to home</Link></div>)
export const NotFoundPage=()=><Box code="404" title="Page Not Found" text="Check the address or head back home."/>
export const UnauthorizedPage=()=><Box code="403" title="Access denied" text="You don't have permission to access this page."/>
