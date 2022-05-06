import { Component, Inject, OnInit } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { Apollo, gql } from 'apollo-angular';
import { GoogleChartInterface, GoogleChartType } from 'ng2-google-charts';

/** Query section */
const lineChartQuery = gql`query lineChartQuery($category: String!, $city: String, $country: String, $permit: String, $plu: String, $startDate: String, $endDate: String, $waterboard: String, $watershed: String, $huc: String ) {
  getMaterialGroupData(category: $category, city: $city,country: $country, permit: $permit, plu:$plu, startDate: $startDate, endDate: $endDate, waterboard: $waterboard, watershed: $watershed, huc: $huc) {
    material_category,
    count,
    date
  }
}`;

@Component({
  selector: 'app-dialog-box',
  templateUrl: './dialog-box.component.html',
  styleUrls: ['./dialog-box.component.css']
})


export class DialogBoxComponent implements OnInit {
  dataTable: any[] = [];
  pieChartFlag: boolean = false;
  showLineChart: boolean = false;
  public pieChart: GoogleChartInterface = {
    chartType: GoogleChartType.PieChart,
    //firstRowIsData: true,
    options: {width: 500, height: 400},
  };
  public barChart: GoogleChartInterface = {
    chartType: GoogleChartType.BarChart,
    //firstRowIsData: true,
    options: {
      width: 500,
      height: 400,
      role: "annotation",
      showValue: true
    },
  };

  /**
   * Line chart setup
   */
   public lineChart: GoogleChartInterface = {
      chartType: GoogleChartType.LineChart,
      options: {
      //  curveType: 'function',
        width: 600,
        height: 400,
        vAxis: {
          title: 'Log/Avg of material category'
        }
      },
  };

  constructor(
    @Inject(MAT_DIALOG_DATA) public data: any,private apollo: Apollo,
    public dialogRef: MatDialogRef<DialogBoxComponent>,
    ) { }

  ngOnInit(): void {
    console.log(this.data)
    if(this.data?.lineChart) {
        this.showLineChart = true;
        this.getLineData();
    } else {
        this.getPieData();
    }
  }
  getPieData():void{
    this.apollo
    .watchQuery({
      query: gql`
      query examplaQuery($category: String!, $city: String, $country: String, $permit: String, $plu: String, $startDate: String, $endDate: String, $waterboard: String, $watershed: String, $huc: String ) {
      getPieSubData(category: $category, city: $city,country: $country, permit: $permit, plu:$plu, startDate: $startDate, endDate: $endDate, waterboard: $waterboard, watershed: $watershed, huc: $huc) {
        material_category,
        itemcount
      }
    }
      `,
      variables:{
          category:this.data?.value[0],
          city: this.data?.city,
          country: this.data?.country,
          permit: this.data?.permit,
          plu: (this.data?.plu).toString(),
          startDate: this.data?.startDate,
          endDate: this.data?.endDate,
          waterboard: this.data?.waterboard,
          Watershed: this.data?.watershed,
          huc:  this.data?.huc
      }
    })
    .valueChanges.subscribe((result: any) => {
      console.log(result,'pie data')
      this.dataTable = [['category', 'count']];
      result?.data?.getPieSubData.forEach((el: any)=> {
        this.dataTable.push([el.material_category, el.itemcount])
      })
      this.pieChartFlag = true;
      this.pieChart.dataTable = this.dataTable;
      this.barChart.dataTable = this.dataTable;

    });
}

/**
   * Get Line chart data
   */
 getLineData():void{
  this.apollo.watchQuery({
      query: lineChartQuery,
      variables: {
        category:this.data?.value[0],
        city: this.data?.city,
        country: this.data?.country,
        permit: this.data?.permit,
        plu: (this.data?.plu).toString(),
        startDate: this.data?.startDate,
        endDate: this.data?.endDate,
        waterboard: this.data?.waterboard,
        Watershed: this.data?.watershed,
        huc:  this.data?.huc
    }
  }).valueChanges.subscribe((result: any) => {
      var responseData = new Array();
      var headers= ["Date"];
      var dateData  = ["Date"];

      result?.data?.getMaterialGroupData.map((res:any, index:number) => {
          let hIndex = headers.indexOf(res.material_category);
          if(hIndex === -1) {
            headers.push(res.material_category);
            hIndex = headers.length - 1;
          }
      });
      var totalEntry = headers.length - 1;
      result?.data?.getMaterialGroupData.map((res:any, index:number) => {
          let hIndex = headers.indexOf(res.material_category);
          let dIndex = dateData.indexOf(res.date);
          let count = Math.log(parseInt(res.count));
          if(hIndex === -1) {
              headers.push(res.material_category);
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
      let dataLineTable = [[...headers]];
      dataLineTable = dataLineTable.concat(responseData);
      this.lineChart.dataTable = dataLineTable;
      this.lineChart.component?.draw();
     // this.lineChartFlag = true;

  });
}

}
