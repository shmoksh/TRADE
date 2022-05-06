const { ApolloServer, gql } = require('apollo-server-express');
const {ApolloServerPluginDrainHttpServer}  =  require('apollo-server-core');

const express = require('express')
const app = express();
const db = require('./database');
const  http =  require('http');

// A schema is a collection of type dsefinitions (hence "typeDefs")
// that together define the "shape" of queries that are executed against
// your data.
  
const typeDefs = gql`
  type RecordMain {
     recordId: Int
     ObjectID: String
     GlobalID: String
     Username: String
     Password: String
     passwordLU: String
     Name: String
     assessment: String
     surveyLocation: String
     permittee: String
     plu:String
     LitterAssessment:Int
     location_name: String!
     Surrounding_Land_Use: String
     Creek_Conditions: String
     Site_Survey: String
     Child_Volunteers_count:Int
     total_number_bags_filled:Int
     weight_of_trash:Int
     homeless_camps_encountered: String
     illegal_dumpsite: String
     notes_about_site: String
     Creation_date: String
     Creator: String
     Edit_date: String
     Editor: String
     x_value:Float
     y_value:Float
     city: String
     county: String
     material_group: String
     itemcount: String
  }
  type Query{
    recordmain(city: String, country: String, permit: String, plu:String, startDate: String, endDate: String, material_group: String, waterboard: String, watershed: String, huc: String ): [RecordMain]
  }
  type cityCountry{
    city: String
    county: String
  }
  type Query{
    getCityCountry: [cityCountry]
  }
  type permittee{
    permittee: String
  }
  type Query{
    getPermittee: [permittee]
  }
  type plu{
    plu: String,
    permittee: String
  }
  type Query {
      getPlu: [plu]
  }
  type HUC {
      HUC8_code: String!
  }
  type Query {
      getHucCode: [HUC]
  }
  type Watershed {
      Watershed_Name: String!
  }
  type Query {
      getWatershed: [Watershed]
  }
  type Waterboard {
      Waterboard_Name: String!
  }
  type Query {
      getWaterboard: [Waterboard]
  }
  type pieData{
    material_group: String,
    count: Int,
  }
  type Query{
    getPieData(city: String, country: String, permit: String, plu:String, startDate: String, endDate: String, material_group: String, waterboard: String, watershed: String, huc: String): [pieData]
  }
  type lineData{
    material_group: String,
    count: Int,
    date: String
  }
  type materialCatData{
    material_category: String,
    count: Int,
    date: String
  }
  
  type litterIndexData{
    date: String,
    count: Float
  }
  type Query{
    getLineData(city: String, country: String, permit: String, plu:String, startDate: String, endDate: String, material_group: String, type: String, waterboard: String, watershed: String, huc: String): [lineData]
  }
  type pieSubData{
    material_category: String,
    itemcount: Int
  }
  type Query{
    getPieSubData(category: String!, city: String, country: String, permit: String, plu:String, startDate: String, endDate: String, material_group: String, waterboard: String, watershed: String, huc: String): [pieSubData]
  }
  type Query{
    getMaterialGroupData(category: String!, city: String, country: String, permit: String, plu:String, startDate: String, endDate: String, material_group: String, type: String, waterboard: String, watershed: String, huc: String): [materialCatData]
  }
  type Query{
    getLitterIndexData(city: String, country: String, permit: String, plu:String, startDate: String, endDate: String, material_group: String, type: String, waterboard: String, watershed: String, huc: String): [litterIndexData]
  }
`;


// Resolvers define the technique for fetching the types defined in the
// schema. This resolver retrieves books from the "books" array above.}
const resolvers = {
    Query: {
      recordmain:async (parent, args, context, info) => {
        let whereCondition = 'WHERE (x_value > 0 || y_value > 0) AND city IS NOT NULL  AND county IS NOT NULL AND location_name!= ""  ';
        console.log('arg', args);
        var locationArr = [];
        if(args){
            if(args.city){
                locationArr = args.city.split(" (");
                whereCondition += ` and city = '${locationArr[0]}'`
            }
            if(locationArr.length == 2){
                whereCondition += ` and county = '${locationArr[1].replace(")", "")}'`
            }
            if(args.permit){
              whereCondition += ` and permittee = '${args.permit}' `
            }
            if(args.plu){
                let plu  = args.plu.split(",");
                whereCondition += ` and plu IN ('${plu.join("','")}') `
            }
            if(args.startDate && args.endDate){
              whereCondition += ` and STR_TO_DATE(Creation_date, '%Y-%m-%d') BETWEEN STR_TO_DATE('${args.startDate}', '%Y-%m-%d') AND STR_TO_DATE('${args.endDate}', '%Y-%m-%d') `
            }
            if(args.waterboard){
                whereCondition += ` and Waterboard_Name = '${args.waterboard}' `
            }
            if(args.watershed){
                whereCondition += ` and Watershed_Name = '${args.watershed}' `
            }
            if(args.huc){
                whereCondition += ` and HUC8_code = '${args.huc}' `
            }
        }
        try { 
        
            const data = await db.query(`SELECT DATE_FORMAT(Creation_date, "%m/%d/%Y") as Edit_date,permittee,LitterAssessment,city,county,location_name,plu, x_value,y_value,
            (select GROUP_CONCAT(DISTINCT record_trashitem.material_group SEPARATOR ', ') 
            from record_trashitem where record_trashitem.recordid = record_main.RecordID  
            GROUP BY record_trashitem.recordid limit 1 ) as material_group, (select SUM(record_trashitem.itemcount) 
            from record_trashitem where record_trashitem.recordid = record_main.RecordID  
            GROUP BY record_trashitem.recordid limit 1 ) as itemcount  
            FROM record_main ${whereCondition}`);
            return data;

        } catch (error) {
            console.log(error)
        }
        // console.log(data);
      },
      getCityCountry:async (parent, args, context, info) => {
        try {
            const data = await db.query(`select CONCAT( city, ' (', county , ')') as city , county from record_main WHERE city IS NOT NULL  AND county IS NOT NULL AND location_name!= ""  group by city, county`);
            return data;

        } catch (error) {
            console.log(error)
        }
        // console.log(data);
      },
      getPermittee:async (parent, args, context, info) => {
        try {
            const data = await db.query(`select permittee from record_main WHERE permittee != '' group by permittee`);
            return data;
        } catch (error) {
            console.log(error)
        }
        // console.log(data);
      },
      getPlu:async (parent, args, context, info) => {
        try {
        const data = await db.query(`select plu,permittee from record_main WHERE plu != '' group by plu,permittee order by plu asc`);
        return data;
        } catch (error) {
            console.log(error)
        }
        // console.log(data);
      },
      getPieData:async (parent, args, context, info) => {
        try {
          let whereCondition = '';
          console.log('asdfsdf', args)
          var locationArr = [];
          if(args){
              if(args.city){
                  locationArr = args.city.split(" (");
                  whereCondition += ` and city = '${locationArr[0]}'`
              }
              if(locationArr.length == 2){
                  whereCondition += ` and county = '${locationArr[1].replace(")", "")}'`
              }
              if(args.permit){
                whereCondition += ` and permittee = '${args.permit}' `
              }
              if(args.plu){
                let plu  = args.plu.split(",");
                whereCondition += ` and plu IN ('${plu.join("','")}') `
              }
              if(args.startDate && args.endDate){
                whereCondition += ` and STR_TO_DATE(Creation_date, '%Y-%m-%d') BETWEEN STR_TO_DATE('${args.startDate}', '%Y-%m-%d') AND STR_TO_DATE('${args.endDate}', '%Y-%m-%d') `
              }

              if(args.waterboard){
                  whereCondition += ` and Waterboard_Name = '${args.waterboard}' `
              }
              if(args.watershed){
                  whereCondition += ` and Watershed_Name = '${args.watershed}' `
              }
              if(args.huc){
                  whereCondition += ` and HUC8_code = '${args.huc}' `
              }
          }
        const data = await db.query(`select material_group , sum(itemcount) as count from record_main left join record_trashitem 
        on record_trashitem.recordid = record_main.RecordID where 1=1 ${whereCondition} group by material_group;`);
        return data;
        } catch (error) {
            console.log(error)
        }
        // console.log(data);
      },
      getPieSubData:async (parent, args, context, info) => {
        try {
            let whereCondition = '1 = 1';
            console.log('asdfsdf', args)
            var locationArr = [];
            if(args){
              if(args.city){
                  locationArr = args.city.split(" (");
                  whereCondition += ` and city = '${locationArr[0]}'`
              }
              if(locationArr.length == 2){
                  whereCondition += ` and county = '${locationArr[1].replace(")", "")}'`
              }
              if(args.permit){
                whereCondition += ` and permittee = '${args.permit}' `
              }
              if(args.plu){
                let plu  = args.plu.split(",");
                whereCondition += ` and plu IN ('${plu.join("','")}') `
              }
              if(args.startDate && args.endDate){
                whereCondition += ` and STR_TO_DATE(Creation_date, '%Y-%m-%d') BETWEEN STR_TO_DATE('${args.startDate}', '%Y-%m-%d') AND STR_TO_DATE('${args.endDate}', '%Y-%m-%d') `
              }
              if(args.waterboard){
                  whereCondition += ` and Waterboard_Name = '${args.waterboard}' `
              }
              if(args.watershed){
                  whereCondition += ` and Watershed_Name = '${args.watershed}' `
              }
              if(args.huc){
                  whereCondition += ` and HUC8_code = '${args.huc}' `
              }
            }
            
            const data = await db.query(`select material_category , sum(itemcount) as itemcount from record_main left join record_trashitem on record_trashitem.recordid = record_main.RecordID where ${whereCondition} AND material_group = '${args.category}'  group by material_category`);
            return data;
            } catch (error) {
                console.log(error)
            }
        // console.log(data);
      },
      getLineData:async (parent, args, context, info) => {
        try {
          let whereCondition = ' WHERE (x_value > 0 || y_value > 0) AND material_group IS NOT NULL ';
          let groupBy = '';
          let orderBy = ' Creation_date ASC';
          console.log('line cgart', args)
          var dateFormat = '%d-%m-%Y';
          var extraField = "";
          var locationArr = [];
          if(args){
              if(args.city){
                locationArr = args.city.split(" (");
                whereCondition += ` and city = '${locationArr[0]}'`
              }
              if(locationArr.length == 2){
                  whereCondition += ` and county = '${locationArr[1].replace(")", "")}'`
              }
              if(args.permit){
                whereCondition += ` and permittee = '${args.permit}' `
              }
              if(args.plu){
                let plu  = args.plu.split(",");
                whereCondition += ` and plu IN ('${plu.join("','")}') `
              }
              if(args.startDate && args.endDate){
                whereCondition += ` and STR_TO_DATE(Creation_date, '%Y-%m-%d') BETWEEN STR_TO_DATE('${args.startDate}', '%Y-%m-%d') AND STR_TO_DATE('${args.endDate}', '%Y-%m-%d') `
              }
              if(args.waterboard){
                  whereCondition += ` and Waterboard_Name = '${args.waterboard}' `
              }
              if(args.watershed){
                  whereCondition += ` and Watershed_Name = '${args.watershed}' `
              }
              if(args.huc){
                  whereCondition += ` and HUC8_code = '${args.huc}' `
              }
              if(args.type){
                switch (args.type) {
                  case 'month':
                    groupBy = ", date"
                    dateFormat ='%M %Y';
                    break;
                  case 'year':
                    groupBy = ", date"
                    dateFormat ='%Y';
                    break;
                  case 'quarterly': 
                    dateFormat ='%M %Y';
                    extraField = ", CASE WHEN QUARTER(Creation_date) = 1 THEN CONCAT('Jan-Mar ', YEAR(Creation_date)) WHEN QUARTER(Creation_date) = 2 THEN CONCAT('Apr-Jun ', YEAR(Creation_date)) WHEN QUARTER(Creation_date) = 3 THEN CONCAT('July-Sep ', YEAR(Creation_date)) WHEN QUARTER(Creation_date) = 3 THEN CONCAT('Oct-Dec ', YEAR(Creation_date)) END as date"
                    groupBy = ", YEAR(Creation_date), QUARTER(Creation_date)";
                    break;
                  case 'semi-annually': 
                    dateFormat ='%M %Y';
                    extraField = ", CASE WHEN CEIL(MONTH(Creation_date) / 6) = 1 THEN CONCAT('Jan-Jun ', YEAR(Creation_date)) WHEN CEIL(MONTH(Creation_date) / 6) = 2 THEN CONCAT('Jul-Dec ', YEAR(Creation_date)) END as date"
                    groupBy = ", YEAR(Creation_date), CEIL(MONTH(Creation_date)) / 6";
                    break;
                  default:
                    
                  break;
                }
              }
          }
        console.log(`select material_group , sum(itemcount) as count, DATE_FORMAT(Creation_date,"${dateFormat}") as date ${extraField} from record_main left join record_trashitem 
        on record_trashitem.recordid = record_main.RecordID  ${whereCondition} group by material_group ${groupBy} ORDER BY ${orderBy}`);
        const data = await db.query(`select material_group , sum(itemcount) as count, DATE_FORMAT(Creation_date,"${dateFormat}") as date ${extraField} from record_main left join record_trashitem 
        on record_trashitem.recordid = record_main.RecordID  ${whereCondition} group by material_group ${groupBy}  ORDER BY ${orderBy};`);
        
        return data;
        } catch (error) {
            console.log(error)
        }
        // console.log(data);
      },

      /** Get line chart data for specific material group */
      getMaterialGroupData:async (parent, args, context, info) => {
        try {
          let whereCondition = ` WHERE (x_value > 0 || y_value > 0) AND material_group = "${args.category}" `;
          let groupBy = '';
          let orderBy = ' Creation_date ASC';
          console.log('line cgart', args)
          var dateFormat = '%d-%m-%Y';
          var extraField = "";
          var locationArr = [];
          if(args){
              if(args.city){
                  locationArr = args.city.split(" (");
                  whereCondition += ` and city = '${locationArr[0]}'`
              }
              if(locationArr.length == 2){
                  whereCondition += ` and county = '${locationArr[1].replace(")", "")}'`
              }
              if(args.permit){
                whereCondition += ` and permittee = '${args.permit}' `
              }
              if(args.plu){
                let plu  = args.plu.split(",");
                whereCondition += ` and plu IN ('${plu.join("','")}') `
              }
              if(args.startDate && args.endDate){
                whereCondition += ` and STR_TO_DATE(Creation_date, '%Y-%m-%d') BETWEEN STR_TO_DATE('${args.startDate}', '%Y-%m-%d') AND STR_TO_DATE('${args.endDate}', '%Y-%m-%d') `
              }

              if(args.waterboard){
                  whereCondition += ` and Waterboard_Name = '${args.waterboard}' `
              }
              if(args.watershed){
                  whereCondition += ` and Watershed_Name = '${args.watershed}' `
              }
              if(args.huc){
                  whereCondition += ` and HUC8_code = '${args.huc}' `
              }
              
              if(args.type){
                switch (args.type) {
                  case 'month':
                    groupBy = ", date"
                    dateFormat ='%M %Y';
                    break;
                  case 'year':
                    groupBy = ", date"
                    dateFormat ='%Y';
                    break;
                  case 'quarterly': 
                    dateFormat ='%M %Y';
                    extraField = ", CASE WHEN QUARTER(Creation_date) = 1 THEN CONCAT('Jan-Mar ', YEAR(Creation_date)) WHEN QUARTER(Creation_date) = 2 THEN CONCAT('Apr-Jun ', YEAR(Creation_date)) WHEN QUARTER(Creation_date) = 3 THEN CONCAT('July-Sep ', YEAR(Creation_date)) WHEN QUARTER(Creation_date) = 3 THEN CONCAT('Oct-Dec ', YEAR(Creation_date)) END as date"
                    groupBy = ", YEAR(Creation_date), QUARTER(Creation_date)";
                    break;
                  case 'semi-annually': 
                    dateFormat ='%M %Y';
                    extraField = ", CASE WHEN CEIL(MONTH(Creation_date) / 6) = 1 THEN CONCAT('Jan-Jun ', YEAR(Creation_date)) WHEN CEIL(MONTH(Creation_date) / 6) = 2 THEN CONCAT('Jul-Dec ', YEAR(Creation_date)) END as date"
                    groupBy = ", YEAR(Creation_date), CEIL(MONTH(Creation_date)) / 6";
                    break;
                  default:
                    
                  break;
                }
              }
          }
        console.log(`select material_category , sum(itemcount) as count, DATE_FORMAT(Creation_date,"${dateFormat}") as date ${extraField} from record_main left join record_trashitem 
        on record_trashitem.recordid = record_main.RecordID  ${whereCondition} group by material_category ${groupBy} ORDER BY ${orderBy}`);
        const data = await db.query(`select material_category , sum(itemcount) as count, DATE_FORMAT(Creation_date,"${dateFormat}") as date ${extraField} from record_main left join record_trashitem 
        on record_trashitem.recordid = record_main.RecordID  ${whereCondition} group by material_category ${groupBy}  ORDER BY ${orderBy};`);
        
        return data;
        } catch (error) {
            console.log(error)
        }
        // console.log(data);
      },

      /**
       * Here, we have get litter index data as per filter from front
       * @param city (optional)
       * @param country (optional)
       * @param permit (optional)
       * @param plu (optional)
       * @param starDate (optional)
       * @param endDate (optional)
       * @return getLitterIndexData Object
       */
      getLitterIndexData: async (parent, args, context, info) => {
          try {
              let whereCondition = ' WHERE (x_value > 0 || y_value > 0)';
              let groupBy = ' date';
              let orderBy = ' Creation_date ASC';
              console.log('line cgart', args)
              var dateFormat = '%d-%m-%Y';
              var extraField = "";
              var locationArr = [];
              if(args){
                  if(args.city){
                      locationArr = args.city.split(" (");
                      whereCondition += ` and city = '${locationArr[0]}'`
                  }
                  if(locationArr.length == 2){
                      whereCondition += ` and county = '${locationArr[1].replace(")", "")}'`
                  }
                  if(args.permit){
                    whereCondition += ` and permittee = '${args.permit}' `
                  }
                  if(args.plu){
                    let plu  = args.plu.split(",");
                    whereCondition += ` and plu IN ('${plu.join("','")}') `
                  }
                  if(args.startDate && args.endDate){
                    whereCondition += ` and STR_TO_DATE(Creation_date, '%Y-%m-%d') BETWEEN STR_TO_DATE('${args.startDate}', '%Y-%m-%d') AND STR_TO_DATE('${args.endDate}', '%Y-%m-%d') `
                  }

                  if(args.waterboard){
                      whereCondition += ` and Waterboard_Name = '${args.waterboard}' `
                  }
                  if(args.watershed){
                      whereCondition += ` and Watershed_Name = '${args.watershed}' `
                  }
                  if(args.huc){
                      whereCondition += ` and HUC8_code = '${args.huc}' `
                  }
                  if(args.type){
                    switch (args.type) {
                      case 'month':
                        groupBy = " date"
                        dateFormat ='%M %Y';
                        break;
                      case 'year':
                        groupBy = " date"
                        dateFormat ='%Y';
                        break;
                      case 'quarterly': 
                        dateFormat ='%M %Y';
                        extraField = ", CASE WHEN QUARTER(Creation_date) = 1 THEN CONCAT('Jan-Mar ', YEAR(Creation_date)) WHEN QUARTER(Creation_date) = 2 THEN CONCAT('Apr-Jun ', YEAR(Creation_date)) WHEN QUARTER(Creation_date) = 3 THEN CONCAT('July-Sep ', YEAR(Creation_date)) WHEN QUARTER(Creation_date) = 3 THEN CONCAT('Oct-Dec ', YEAR(Creation_date)) END as date"
                        groupBy = " YEAR(Creation_date), QUARTER(Creation_date)";
                        break;
                      case 'semi-annually': 
                        dateFormat ='%M %Y';
                        extraField = ", CASE WHEN CEIL(MONTH(Creation_date) / 6) = 1 THEN CONCAT('Jan-Jun ', YEAR(Creation_date)) WHEN CEIL(MONTH(Creation_date) / 6) = 2 THEN CONCAT('Jul-Dec ', YEAR(Creation_date)) END as date"
                        groupBy = " YEAR(Creation_date), CEIL(MONTH(Creation_date)) / 6";
                        break;
                      default:
                        
                      break;
                    }
                  }
              }

              console.log(`select ROUND(AVG(LitterAssessment),2) as count, DATE_FORMAT(Creation_date,"${dateFormat}") as date ${extraField} from record_main left join record_trashitem 
              on record_trashitem.recordid = record_main.RecordID  ${whereCondition} group by ${groupBy} ORDER BY ${orderBy};`);
              return await db.query(`select ROUND(AVG(LitterAssessment),2) as count, DATE_FORMAT(Creation_date,"${dateFormat}") as date ${extraField} from record_main left join record_trashitem 
              on record_trashitem.recordid = record_main.RecordID  ${whereCondition} group by ${groupBy} ORDER BY ${orderBy};`);
          } catch(error) {

          }
      },

      getHucCode : async (parent, args, context, info) => {
        try {
           return await db.query(`select HUC8_code from record_main WHERE HUC8_code != '' AND HUC8_code IS NOT NULL group by HUC8_code order by HUC8_code`);
        } catch (error) {
            console.log(error)
        }
      },

      getWatershed : async (parent, args, context, info) => {
          try {
            return await db.query(`select Watershed_Name from record_main WHERE Watershed_Name != '' AND Watershed_Name IS NOT NULL group by Watershed_Name order by Watershed_Name`);
          } catch (error) {
              console.log(error)
          }
      },
      getWaterboard : async (parent, args, context, info) => {
          try {
            return await db.query(`select Waterboard_Name from record_main WHERE Waterboard_Name != '' AND Waterboard_Name IS NOT NULL group by Waterboard_Name order by Waterboard_Name`);
          } catch (error) {
              console.log(error)
          }
      },
    }
  };

  async function startApolloServer(typeDefs, resolvers) {

      const httpServer = http.createServer(app);
      var path = require('path');
      var public = path.join(__dirname, 'views/dist');

      const server = new ApolloServer({ typeDefs, resolvers,
        introspection: false,
        plugins: [ApolloServerPluginDrainHttpServer({ httpServer })],
      
      });
      
      await server.start();
      server.applyMiddleware({ app });
      app.use(express.static(__dirname.replace(/\\/g, "/") + '/views/dist'))
      app.get('/', function(req, res) {
          res.sendFile(path.join(public, 'index.html'));
      });
      app.listen({port: 8080 }, () =>
      
      console.log(`🚀 Server ready at http://localhost:8080${server.graphqlPath}`)
      
  );
}
startApolloServer(typeDefs, resolvers);
  
