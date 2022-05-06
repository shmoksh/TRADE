import {  Component,  OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Apollo, gql } from 'apollo-angular';
import * as moment from 'moment';
import { GoogleChartInterface, GoogleChartType } from 'ng2-google-charts';
import { MatDialog } from '@angular/material/dialog';
import { DialogBoxComponent } from './dialog-box/dialog-box.component';
import {FormGroup, FormControl} from '@angular/forms';
import {map, startWith, debounceTime} from 'rxjs/operators';
import {Observable} from 'rxjs';


/****Query Manager***/
const litterIndexQuery = gql`query litterIndexQuery($city: String, $country: String, $permit: String, $plu: String, $startDate: String, $endDate: String, $type: String, $waterboard: String, $watershed: String, $huc: String ) {
    getLitterIndexData(city: $city,country: $country, permit: $permit, plu:$plu, startDate: $startDate, endDate: $endDate, type: $type, waterboard: $waterboard, watershed: $watershed, huc: $huc ) {
        count,
        date
    }
}`;

const lineChartQuery = gql`query lineChartQuery($city: String, $country: String, $permit: String, $plu: String, $startDate: String, $endDate: String, $type: String,  $waterboard: String, $watershed: String, $huc: String ) {
    getLineData(city: $city,country: $country, permit: $permit, plu:$plu, startDate: $startDate, endDate: $endDate, type: $type, waterboard: $waterboard, watershed: $watershed, huc: $huc) {
        material_group,
        count,
        date
    }
}`;

const pieChartQuery = gql`query pieChartQuery($city: String, $country: String, $permit: String, $plu: String, $startDate: String, $endDate: String,  $waterboard: String, $watershed: String, $huc: String ) {
    getPieData(city: $city,country: $country, permit: $permit, plu:$plu, startDate: $startDate, endDate: $endDate, waterboard: $waterboard, watershed: $watershed, huc: $huc) {
        material_group,
        count
    }
}`;

const pluQuery = gql`query pluQuery {
    getPlu {
        plu,
        permittee
    }
}`;

const permitteeQuery = gql`query permitteeQuery {
    getPermittee {
      permittee
    }
}`;

const cityCountryQuery = gql`query cityCountryQuery {
    getCityCountry {
        city,
        county
    }
}`;

const hucCodeQuery = gql`query hucCodeQuery {
    getHucCode {
        HUC8_code
    }
}`;

const watershedQuery = gql`query watershedQuery {
    getWatershed {
       Watershed_Name
    }
}`;

const waterboardQuery = gql`query waterboardQuery {
    getWaterboard {
      Waterboard_Name
    }
}`;

const tableQuery = gql`query tableQuery($city: String, $country: String, $permit: String, $plu: String, $startDate: String, $endDate: String,  $waterboard: String, $watershed: String, $huc: String ) {
    recordmain(city: $city,country: $country, permit: $permit, plu:$plu, startDate: $startDate, endDate: $endDate, waterboard: $waterboard, watershed: $watershed, huc: $huc) {
        city,
        county,
        location_name,
        LitterAssessment,
        Edit_date,
        material_group,
        plu,
        itemcount,
        x_value,
        y_value,
        permittee
    }
}`;

/** END Query  */

export interface TradeDataInterface {
  location_name: string;
  LitterAssessment: number;
  Edit_date: string;
  plu: number;
  itemcount: number;
  material_group: string;
  x_value: number;
  y_value: number;
  permittee: string;
}

export interface Country {
  city: string,
  county:  string
}

export interface Permittee {
  permittee: string
}

export interface HUC8Code {
  HUC8_code: string
}

export interface Watershed {
  Watershed_Name: string
}

export interface Waterboard {
  Waterboard_Name: string
}

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})

export class AppComponent implements OnInit  {
  cityCountryList : any[] = [];
  hucCodes : any[] = [];
  watershed : any[] = [];
  permitList : any[] = [];
  waterboard : any[] = [];
  pluList : any[] = [];
  displayedColumns: string[] = ['location_name', 'LitterAssessment', 'Edit_date', 'plu', 'itemcount', 'material_group'];
  lineBySelected: string = 'month';
  litterIndexSelected: string = 'month';
  showLineChart: boolean = false;
  showBarChart: boolean = false;
  showLitterIndexChart: boolean =  false;
  lat: number  = 38.687654;
  lng: number =  -101.513672;
  zoom: number = 6;
  myControl = new FormControl();
  permiteeControl = new FormControl();
  hucCodeControl = new FormControl();
  watershedControl = new FormControl();
  waterboardControl = new FormControl();
  filteredCountries?: Observable<Country[]>;
  filteredPermitee?: Observable<Permittee[]>;
  filteredHucCodes?: Observable<HUC8Code[]>;
  filteredWatershed?: Observable<Watershed[]>;
  filteredWaterboard?: Observable<Waterboard[]>;
  tempPermittee: any = '';
  constructor(private http: HttpClient, private apollo: Apollo, public dialog: MatDialog) {

  }

  filterBy: number = 1;
  title = 'trade-dashboard';
  selectedCountry: any = '';
  selectedPermit: any = '';
  selectedPlu: any = '';
  selectedHuc: any = '';
  selectedWatershed: any = '';
  selectedWaterboard: any = '';
  startDate = '';
  endDate = ''
  startDateObj:any = '';
  endDateObj:any = '';
  data: TradeDataInterface[] = [];
  loading = true;
  error: any;
  dataTable: any[] = [];
  dataLineTable: any[] = [];
  pieChartFlag: boolean = false;
  barChartFlag: boolean = false;
  lineChartFlag: boolean = false;
  litterIndexFlag: boolean = false;
  mapData: any =[];
  dialogData: any;
  monthDiff: number  = -1;
  littlerIndexIcon: any[] = [];
  todayDate: any = new Date();
  dateRange = new FormGroup({
    start: new FormControl(),
    end: new FormControl(),
  });
  currentTab: number = 0;
  markerColor: any[] = [
      "http://maps.google.com/mapfiles/ms/icons/blue-dot.png",
      "https://maps.google.com/mapfiles/ms/icons/green-dot.png",
      "https://maps.google.com/mapfiles/ms/icons/orange-dot.png",
      "https://maps.google.com/mapfiles/ms/icons/purple-dot.png",
      "https://maps.google.com/mapfiles/ms/icons/red-dot.png"
  ];
  /**
   * Pie chart setup
   */
  public pieChart: GoogleChartInterface = {
      chartType: GoogleChartType.PieChart,
      options: {width: 700, height: 500},
  };

  /**
   * Bar chart setup
   */
  public barChart: GoogleChartInterface = {
      chartType: GoogleChartType.BarChart,
      options: {
        width: 700,
        height: 500,
        role: "annotation",
        showValue: true,
        hAxis: {
          showTextEvery: 1,
          slantedText:true,

        },
        yAxis: {
          showTextEvery: 1,
          slantedText:true,
          slantedTextAngle: 90,
          textPosition: 'none'
        },
        chartArea: {
          width: '100%',
          left:100
        },
      },
  };

  /**
   * Line chart setup
   */
  public lineChart: GoogleChartInterface = {
      chartType: GoogleChartType.LineChart,
      options: {
       // curveType: 'function',
        width: 700,
        height: 550,
        vAxis: {
          title: 'Log/Avg of material group'
        }
      },
  };

  /**
   * Litter Index chart Set up
   */
  public litterIndexlineChart: GoogleChartInterface = {
      chartType: GoogleChartType.LineChart,
      options: {
          width: 700,
          height: 550,
          vAxis: {minValue: 0}
      }
  };

  /**
   * Get table data
   */
  getData():void{
      this.apollo.watchQuery({
          query: tableQuery,
          variables: this.getFilterData(-1)
      }).valueChanges.subscribe((result: any) => {
          const temp: TradeDataInterface[] = result?.data?.recordmain
          this.data = temp;
          console.log(this.data.length, this.data );
          if(this.data.length > 0) {
            this.lng = this.data[0].x_value;
            this.lat = this.data[0].y_value;
          }
          this.loading = result.loading;
          this.error = result.error;
      });
  }

  /**
   * Get city/country data
   */
  getCityCountry():void{
      this.apollo.watchQuery({
          query: cityCountryQuery,
      }).valueChanges.subscribe((result: any) => {
          this.cityCountryList = result?.data?.getCityCountry;
      })
  }

  /**
   * Get HucCode
   */
  getHucCode(): void {
      this.apollo.watchQuery({
        query: hucCodeQuery,
      }).valueChanges.subscribe((result: any) => {
          console.log(result);
          this.hucCodes = result?.data?.getHucCode;
      })
  }

  /**
   * Get Watershed_Name
   */
  getWatershed(): void {
      this.apollo.watchQuery({
          query: watershedQuery,
      }).valueChanges.subscribe((result: any) => {
          this.watershed = result?.data?.getWatershed;
      })
  }

  /**
   * Get Watershed_Name
   */
  getWaterboard(): void {
      this.apollo.watchQuery({
          query: waterboardQuery,
      }).valueChanges.subscribe((result: any) => {
          this.waterboard = result?.data?.getWaterboard;
      })
  }




  /**
   * Get Permittee data
   */
  getPermittee():void{
      this.apollo.watchQuery({
          query: permitteeQuery,
      }).valueChanges.subscribe((result: any) => {
          this.permitList = result?.data?.getPermittee;
      });
  }

  /**
   * Get PLU data
   */
  getPlu():void{
      this.apollo.watchQuery({
          query: pluQuery,
      }).valueChanges.subscribe((result: any) => {
          this.pluList = result?.data?.getPlu;
      });
  }

  /**
   * On init get require data like city/permittee/plu and table data
   */
  ngOnInit() {
      this.filteredCountries =  this.myControl.valueChanges.pipe(
        startWith(''),debounceTime(500),
        map(name => name ? this._filter(name) : this.cityCountryList.slice())
      )
      this.filteredPermitee = this.permiteeControl.valueChanges.pipe(
          startWith(''),
          map(name => name ? this._filterPermitte(name) : this.permitList.slice())
      )
      this.filteredHucCodes = this.hucCodeControl.valueChanges.pipe(
          startWith(''),
          map(name => name ? this._filterHuc(name) : this.hucCodes.slice())
      )
      this.filteredWatershed = this.watershedControl.valueChanges.pipe(
          startWith(''),
          map(name => name ? this._filterWatershed(name) : this.watershed.slice())
      )
      this.filteredWaterboard = this.waterboardControl.valueChanges.pipe(
          startWith(''),
          map(name => name ? this._filterWatershed(name) : this.waterboard.slice())
      )

      this.getWaterboard();
      this.getWatershed();
      this.getCityCountry();
      this.getHucCode();
      this.getPermittee();
      this.getPlu();
      this.getData();

  }

  //Clear Filter
  clearFilter(): void {
      this.selectedPermit = '';
      this.selectedCountry = '';
      this.startDate = '';
      this.endDate = '';
      this.startDateObj = '';
      this.endDateObj = '';
      this.selectedPlu = '';
      this.filterBy = 1;
      this.monthDiff = -1;
      this.selectedWaterboard = '';
      this.selectedWatershed = '';
      this.selectedHuc = '';
      this.barChartFlag = false;
      this.tempPermittee = '';
      this.onTabChanged(null);
  }

  /**
   * Reset all optinal filter
   */
  resetOptinalFilter(): void{
      this.selectedPermit = '';
      this.tempPermittee = '';
      this.selectedCountry = '';
      this.selectedHuc  = '';
      this.selectedWaterboard = '';
      this.selectedWatershed = '';
      this.selectedPlu = '';
  }

  /**
   * Apply filter
   */
  onButtonClick(): void{
      if(this.startDateObj != null && this.startDateObj != '') {
          this.startDate = moment(this.startDateObj).format('YYYY-MM-DD');
      }
      if(this.endDateObj != null && this.endDateObj != '') {
          this.endDate   = moment(this.endDateObj ).format('YYYY-MM-DD');
      }

      this.setMonthDiff();
      this.onTabChanged(null);
  }

  /**
   * Set month different
   */
  setMonthDiff() : void{
    let startMonth: any = '', endMonth: any = '';
    if(this.startDateObj != null && this.startDateObj != '') {
      startMonth = moment(this.startDateObj);
    }
    if(this.endDateObj != null && this.endDateObj != '') {
      endMonth = moment(this.endDateObj);
    }
    if(startMonth == ""  || endMonth == "") {
        this.monthDiff = -1;
    } else {
        this.monthDiff = endMonth.diff(startMonth, 'month');
    }
  }

  /**
   * Get Pie chart data and set to graph
   */
  getPieData():void{
      this.pieChartFlag = false;
      this.barChartFlag = false;
      this.apollo.watchQuery({
          query: pieChartQuery,
          variables: this.getFilterData(-1)
      }).valueChanges.subscribe((result: any) => {
          this.dataTable = [['group', 'count']];
          result?.data?.getPieData.forEach((el: any)=> {
              this.dataTable.push([el.material_group, el.count])
          })
          this.barChart.dataTable = this.dataTable;
          this.pieChart.dataTable = this.dataTable;
          this.pieChartFlag = true;
          this.barChartFlag = true;
      });
  }

  /**
   * Get Line chart data
   */
  getLineData():void{
      this.lineChartFlag = false;
      this.apollo.watchQuery({
          query: lineChartQuery,
          variables: this.getFilterData(this.lineBySelected)
      }).valueChanges.subscribe((result: any) => {
          var responseData = new Array();
          var headers= ["Date"];
          var dateData  = ["Date"];

          result?.data?.getLineData.map((res:any, index:number) => {
              let hIndex = headers.indexOf(res.material_group);
              if(hIndex === -1) {
                headers.push(res.material_group);
                hIndex = headers.length - 1;
              }
          });
          var totalEntry = headers.length - 1;
          result?.data?.getLineData.map((res:any, index:number) => {
              let hIndex = headers.indexOf(res.material_group);
              let dIndex = dateData.indexOf(res.date);
              let count = Math.log(parseInt(res.count));
              if(hIndex === -1) {
                  headers.push(res.material_group);
                  hIndex = headers.length - 1;
              }
              if(dIndex === -1) {
                  responseData[dateData.length -1 ] = [];
                  responseData[dateData.length -1 ][0] = res.date;
                  for(let i=1; i<= totalEntry; i++) {
                      responseData[dateData.length -1][i] = (hIndex == i) ? count : 0;
                  }
                  dateData.push(res.date);
              } else {
                  dIndex--;
                  responseData[dIndex][hIndex] = responseData[dIndex][hIndex] + count;
              }
          });
          //console.log(responseData );
          // let fData = responseData.map(function(res1, index) {
          //       console.log(res1);
          //       for(let i=1; i<= totalEntry; i++) {
          //           responseData[index][i] =Math.log10(res1[i]);
          //       }
          //       //return Math.log(parseInt(res1));
          // });
          this.dataLineTable = [[...headers]];
          this.dataLineTable = this.dataLineTable.concat(responseData);
          this.lineChart.dataTable = this.dataLineTable;
          this.lineChart.component?.draw();
          this.lineChartFlag = true;

      });
  }

  /**
   * Get Litter Index data for line chart
   */
  litterIndexData(): void {
      this.litterIndexFlag = false;
      this.apollo.watchQuery({
        query: litterIndexQuery,
        variables: this.getFilterData(this.litterIndexSelected)
      })
      .valueChanges.subscribe((result: any) => {
          this.litterIndexFlag = false;
          this.litterIndexlineChart.dataTable = [];
          if(result?.data?.getLitterIndexData != null) {
              var responseData = new Array();
              var headers = ['Date', "Litter Index"];

              let litterIndexDataFinal = [[...headers]];
              result?.data?.getLitterIndexData.map((res:any, index:number) => {
                  responseData[index] = [res.date,res.count];
              });
              litterIndexDataFinal = litterIndexDataFinal.concat(responseData);

              this.litterIndexlineChart.dataTable = litterIndexDataFinal;
              this.litterIndexlineChart.component?.draw();
              this.litterIndexFlag = true;
          }

      });
  }

  /**
   * Set filter Data
   * @param  void
   * @return Object
   */
  getFilterData(type: any) : any {
      console.log(this.selectedCountry);
      if(type != -1) {
          return {
              city: this.selectedCountry && this.selectedCountry ? this.selectedCountry : '',
              country: "",//this.selectedCountry && this.selectedCountry.county ? this.selectedCountry.county : '',
              permit: this.tempPermittee,
              plu: (this.selectedPlu).toString(),
              startDate: this.startDate,
              endDate: this.endDate,
              type,
              waterboard: this.selectedWaterboard,
              watershed: this.selectedWatershed,
              huc:  this.selectedHuc
          };
      } else {
          return {
              city: this.selectedCountry && this.selectedCountry ? this.selectedCountry : '',
              country: "", //this.selectedCountry && this.selectedCountry.county ? this.selectedCountry.county : '',
              permit: this.tempPermittee,
              plu: (this.selectedPlu).toString(),
              startDate: this.startDate,
              endDate: this.endDate,
              waterboard: this.selectedWaterboard,
              watershed: this.selectedWatershed,
              huc:  this.selectedHuc
          };
      }
  }

  /**
   * Pie chart click event fire function
   */
  onChartSelect(event: any): void{
      if(event && event.selectedRowValues && event.selectedRowValues.length > 0){
          this.dialogData = event.selectedRowValues;
      }
      const dialogRef = this.dialog.open(DialogBoxComponent,{
          width: '600px',
          height: 'auto',
          data: {
              value: this.dialogData,
              city: this.selectedCountry && this.selectedCountry ? this.selectedCountry : '',
              country:"", // this.selectedCountry && this.selectedCountry.county ? this.selectedCountry.county : '',
              permit: this.tempPermittee,
              plu: (this.selectedPlu).toString(),
              startDate: this.startDate,
              endDate: this.endDate,
              barChart: false,
              waterboard: this.selectedWaterboard,
              watershed: this.selectedWatershed,
              huc:  this.selectedHuc
          },
      });

      dialogRef.afterClosed().subscribe(result => {
        //console.log(`Dialog result: ${result}`);
      });
  }

  /**
   * This method called when bar chart spice
   */
  onBarChartSelect(event: any): void{
      if(event && event.selectedRowValues && event.selectedRowValues.length > 0){
          this.dialogData = event.selectedRowValues;
      }
      const dialogRef = this.dialog.open(DialogBoxComponent,{
          width: '600px',
          height: 'auto',
          data: {
              value: this.dialogData,
              city: this.selectedCountry && this.selectedCountry ? this.selectedCountry : '',
              country:"", // this.selectedCountry && this.selectedCountry.county ? this.selectedCountry.county : '',
              permit: this.tempPermittee,
              plu: (this.selectedPlu).toString(),
              startDate: this.startDate,
              endDate: this.endDate,
              barChart: true,
              waterboard: this.selectedWaterboard,
              watershed: this.selectedWatershed,
              huc:  this.selectedHuc
          },
    });

    dialogRef.afterClosed().subscribe(result => {
        //console.log(`Dialog result: ${result}`);
    });
  }

  /**
   * Method called when we call line chart material group
   */
  onLineChartSelect(event:any): void {
      console.log("here")
      console.log(event)

      if(event && event.columnLabel && event.columnLabel.length > 0){
          this.dialogData = event.columnLabel;
      }
      const dialogRef = this.dialog.open(DialogBoxComponent,{
          width: '700px',
          height: 'auto',
          data: {
              value: [this.dialogData],
              city: this.selectedCountry && this.selectedCountry ? this.selectedCountry : '',
              country:"", // this.selectedCountry && this.selectedCountry.county ? this.selectedCountry.county : '',
              permit: this.tempPermittee,
              plu: (this.selectedPlu).toString(),
              startDate: this.startDate,
              endDate: this.endDate,
              barChart: false,
              lineChart: true,
              waterboard: this.selectedWaterboard,
              watershed: this.selectedWatershed,
              huc:  this.selectedHuc
          },
    });

    dialogRef.afterClosed().subscribe(result => {
        //console.log(`Dialog result: ${result}`);
    });
  }

  /**
   * Line chart option change event manage
   */
  lineChartOptionChange(event: any):void{
    this.lineChartFlag = false;
    this.getLineData();
  }

  /**
   * Litter Index filter apply
   */
  litterIndexApplyFilter(event:any): void {
    this.litterIndexFlag = false;
    this.litterIndexData();
  }

  /**
   * This method called when user change tab and it will start with  0
   */
  onTabChanged(event: any):void{
      if(event != null) {
        this.currentTab = event.index;
      }
      this.getData();
       if(this.currentTab === 1) {
          this.litterIndexData();
          this.showLitterIndexChart = false;
      } else if(this.currentTab === 2){
          this.getPieData();
      } else if(this.currentTab === 3){
          this.getPieData();
          this.showBarChart = true;
      } else if(this.currentTab === 4){
          this.getLineData();
          this.showLineChart = true;
      }
  }

  private _filter(value: string): string[] {
    console.log(value);
    const filterValue = value.toLowerCase();
    return this.cityCountryList.filter(option => option.city.toLowerCase().includes(filterValue));

  }

  private _filterPermitte(value: string): string[] {
    this.selectedPlu = '';
    const filterValue = value.toLowerCase();
    return this.permitList.filter(option => option.permittee.toLowerCase().includes(filterValue));
  }

  private _filterHuc(value: string): string[] {
    const filterValue = value.toLowerCase();
    return this.hucCodes.filter(option => option.HUC8_code.toLowerCase().includes(filterValue));
  }

  private _filterWatershed(value: string): string[] {
    const filterValue = value.toLowerCase();
    return this.watershed.filter(option => option.Watershed_Name.toLowerCase().includes(filterValue));
  }

  /**
   * On select permittee
   */
  onSelectPermit(value:any)
  {
      this.tempPermittee = value;
  }



}

