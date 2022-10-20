sap.ui.define([
    "sap/ui/core/mvc/Controller"
],
    /**
     * @param {typeof sap.ui.core.mvc.Controller} Controller
     */
    function (Controller) {
        "use strict";

        return Controller.extend("com.act.workflowuimodule.controller.MyTaskUI", {
            onInit: function () {
                // var oModel = this.getOwnerComponent().getModel();
                //     var oData = {
                //         "manufacturerCode": '454',
                //         "countryCode_code": 'AD',
                //         "uuid": '1f07153d-99d6-4582-8ea2-c5678fb04df1'
                //     }
                //     this.getModel("taskData").setProperty("/data", oData);
                //     var oParms = this.getModel("taskData").getProperty("/data");
                // aFilter.push(new Filter("Vendor_List_manufacturerCode", FilterOperator.EQ, oSelObj.manufacturerCode, true));
                // aFilter.push(new Filter("Vendor_List_uuid", FilterOperator.EQ, oSelObj.uuid, true));
                // aFilter.push(new Filter("Vendor_List_countryCode_code", FilterOperator.EQ, oSelObj.countryCode_code, true));
                // oList.getBinding("items").filter(aFilter);
            }
        });
    });
