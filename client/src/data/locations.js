export const LOCATIONS=['Bengaluru','Bangalore','Mumbai','Bombay','Delhi','New Delhi','Hyderabad','Chennai','Madras','Pune','Kolkata','Calcutta','Ahmedabad','Noida','Gurugram','Gurgaon','Jaipur','Kochi','Chandigarh','Indore','Coimbatore','Nagpur','Bhubaneswar','Visakhapatnam','London','New York','San Francisco','Toronto','Sydney','Singapore','Dubai','Berlin','Amsterdam','Paris','Austin','Seattle','Boston','Chicago','Los Angeles','Vancouver','Melbourne','Tel Aviv','Zurich','Stockholm','Copenhagen','Lisbon','Dublin','Warsaw','Remote','Work from Home','WFH','India','United States','USA','US','United Kingdom','UK','Britain','Canada','Australia','Singapore','UAE','Dubai','Germany','Netherlands','France','Brazil','Japan','South Korea','Israel','Sweden','Denmark'];

// Maps known locations to the LinkedIn region subdomain prefix that indexes them.
// Used to warn when the selected region can't contain a chosen location.
export const LOC_REGION={
  'Bengaluru':'in.','Bangalore':'in.','Mumbai':'in.','Bombay':'in.','Delhi':'in.','New Delhi':'in.','Hyderabad':'in.','Chennai':'in.','Madras':'in.','Pune':'in.','Kolkata':'in.','Calcutta':'in.','Ahmedabad':'in.','Noida':'in.','Gurugram':'in.','Gurgaon':'in.','Jaipur':'in.','Kochi':'in.','Chandigarh':'in.','Indore':'in.','Coimbatore':'in.','Nagpur':'in.','Bhubaneswar':'in.','Visakhapatnam':'in.','India':'in.',
  'London':'uk.','United Kingdom':'uk.','UK':'uk.','Britain':'uk.',
  'New York':'www.','San Francisco':'www.','Austin':'www.','Seattle':'www.','Boston':'www.','Chicago':'www.','Los Angeles':'www.','United States':'www.','USA':'www.','US':'www.',
  'Toronto':'ca.','Vancouver':'ca.','Canada':'ca.',
  'Sydney':'au.','Melbourne':'au.','Australia':'au.',
  'Singapore':'sg.',
  'Dubai':'ae.','UAE':'ae.',
  'Berlin':'de.','Germany':'de.',
  'Paris':'fr.','France':'fr.',
  'Brazil':'br.',
};
export const REGION_NAMES={'in.':'India','uk.':'United Kingdom','ca.':'Canada','www.':'USA','ae.':'UAE','fr.':'France','au.':'Australia','de.':'Germany','sg.':'Singapore','br.':'Brazil'};
