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
            },
            onLiveChange: function (oEvent) {
                var sValue = oEvent.getParameter("value");
                // this.getOwnerComponent().getModel("taskData").setProperty("/oComment/sComment", sValue);
                if (sValue === "" || sValue === undefined) {
                    // this.getOwnerComponent().getModel("taskData").setProperty("/oComment/valueState", "Error");
                    this.getOwnerComponent().getModel("taskData").setProperty("/oComment/sComment", sValue);
                    // this.getOwnerComponent().getModel("taskData").setProperty("/oComment/valueStateText", "Please enter comment");
                } else {
                    this.getOwnerComponent().getModel("taskData").setProperty("/oComment/valueState", "None");
                    this.getOwnerComponent().getModel("taskData").setProperty("/oComment/sComment", sValue);
                    this.getOwnerComponent().getModel("taskData").setProperty("/oComment/valueStateText", "");
                }
            }
        });
    });
