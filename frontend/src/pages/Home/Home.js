import react from 'react';
import Banner from '../../components/Banner/Banner';
import KryptOption from '../../components/KryptOptions/KryptOptions';


const Home = () =>{
    return(<>
       <Banner/>
       <KryptOption  style={{margin:"100px"}}/>
       </>
    )
}

export default Home;