sap.ui.define(
    [
        "sap/ui/core/UIComponent",
        "sap/ui/Device",
        "sap/ui/model/Filter",
        "sap/ui/model/FilterOperator",
        "com/act/workflowuimodule/model/models",
    ],
    function (UIComponent, Device, Filter, FilterOperator, models) {
        "use strict";

        return UIComponent.extend(
            "com.act.workflowuimodule.Component",
            {
                metadata: {
                    manifest: "json",
                },

                /**
                 * The component is initialized by UI5 automatically during the startup of the app and calls the init method once.
                 * @public
                 * @override
                 */
                init: function () {
                    // call the base component's init function
                    UIComponent.prototype.init.apply(this, arguments);
                    var startupParameters = this.getComponentData().startupParameters;
                    this.setModel(startupParameters.taskModel, "task");
                    var queryParameters = startupParameters.oParameters.oQueryParameters
                    if (queryParameters.data) {
                        this.getModel("taskData").setProperty("/data", JSON.parse(queryParameters.data));
                    }

                    // enable routing
                    this.getRouter().initialize();

                    // set the device model
                    this.setModel(models.createDeviceModel(), "device");
                    this.prepareTaskModels();
                    this.getCountryCodes();
                },
                getCountryCodes: async function () {
                    var oModel = this.getModel();
                    // var oData = {
                    //     "manufacturerCode": '454',
                    //     "countryCode_code": 'AD',
                    //     "uuid": '1f07153d-99d6-4582-8ea2-c5678fb04df1'
                    // }
                    // this.getModel("taskData").setProperty("/data", oData);
                    var oParms = this.getModel("taskData").getProperty("/data");
                    var sPath = "/VendorList(manufacturerCode='" + oParms.manufacturerCode + "',countryCode_code='" + oParms.countryCode_code + "',uuid=guid'" + oParms.uuid + "')";
                    var oData = await $.get(oModel.sServiceUrl + sPath);
                    if (oData.d) {
                        this.getModel("taskData").setProperty("/oMainData", oData.d);
                    }
                    this.getCommentsData();
                },
                getCommentsData: function () {
                    var oModel = this.getModel();
                    // var oData = {
                    //     "manufacturerCode": '9000',
                    //     "countryCode_code": 'IT',
                    //     "uuid": '8e772605-538f-4fa9-9bee-49265c028771'
                    // }
                    // this.getModel("taskData").setProperty("/data", oData);
                    var oParms = this.getModel("taskData").getProperty("/data");
                    var aFilter = [];
                    aFilter.push(new Filter("Vendor_List_manufacturerCode", FilterOperator.EQ, oParms.manufacturerCode, true));
                    aFilter.push(new Filter("Vendor_List_uuid", FilterOperator.EQ, oParms.uuid, true));
                    aFilter.push(new Filter("Vendor_List_countryCode_code", FilterOperator.EQ, oParms.countryCode_code, true));
                    oModel.read("/VendorComments", {
                        filters: aFilter,
                        success: function (oData) {
                            this.getModel("taskData").setProperty("/aComments", oData.results);
                        }.bind(this),
                        error: function (oError) {

                        }.bind(this)
                    });
                },
                prepareTaskModels: function () {

                    this.setTaskModels();

                    this.getInboxAPI().addAction(
                        {
                            action: "APPROVE",
                            label: "Approve",
                            type: "accept", // (Optional property) Define for positive appearance
                        },
                        function () {
                            this.completeTask(true);
                        },
                        this
                    );

                    this.getInboxAPI().addAction(
                        {
                            action: "REJECT",
                            label: "Reject",
                            type: "reject", // (Optional property) Define for negative appearance
                        },
                        function () {
                            this.completeTask(false);
                        },
                        this
                    );
                    this.getInboxAPI().getDescription("NA", this.getTaskInstanceID()).done(function (data) {
                        this.getModel("task").setProperty("/Description", data.Description)
                    }.bind(this));
                },

                setTaskModels: function () {
                    // set the task model
                    var startupParameters = this.getComponentData().startupParameters;
                    this.setModel(startupParameters.taskModel, "task");

                    // set the task context model
                    var taskContextModel = new sap.ui.model.json.JSONModel(
                        this._getTaskInstancesBaseURL() + "/context"
                    );
                    this.setModel(taskContextModel, "context");
                },

                _getTaskInstancesBaseURL: function () {
                    return (
                        this._getWorkflowRuntimeBaseURL() +
                        "/task-instances/" +
                        this.getTaskInstanceID()
                    );
                },

                _getWorkflowRuntimeBaseURL: function () {
                    var appId = this.getManifestEntry("/sap.app/id");
                    var appPath = appId.replaceAll(".", "/");
                    var appModulePath = jQuery.sap.getModulePath(appPath);

                    return appModulePath + "/bpmworkflowruntime/v1";
                },

                getTaskInstanceID: function () {
                    return this.getModel("task").getData().InstanceID;
                },

                getInboxAPI: function () {
                    var startupParameters = this.getComponentData().startupParameters;
                    return startupParameters.inboxAPI;
                },

                completeTask: function (approvalStatus) {
                    this.getModel("context").setProperty("/approved", approvalStatus);
                    this._patchTaskInstance();
                    this._refreshTaskList();
                },

                _patchTaskInstance: function () {
                    var data = {
                        status: "COMPLETED",
                        context: this.getModel("context").getData(),
                    };

                    jQuery.ajax({
                        url: this._getTaskInstancesBaseURL(),
                        method: "PATCH",
                        contentType: "application/json",
                        async: false,
                        data: JSON.stringify(data),
                        headers: {
                            "X-CSRF-Token": this._fetchToken(),
                        },
                    });
                },

                _fetchToken: function () {
                    var fetchedToken;

                    jQuery.ajax({
                        url: this._getWorkflowRuntimeBaseURL() + "/xsrf-token",
                        method: "GET",
                        async: false,
                        headers: {
                            "X-CSRF-Token": "Fetch",
                        },
                        success(result, xhr, data) {
                            fetchedToken = data.getResponseHeader("X-CSRF-Token");
                        },
                    });
                    return fetchedToken;
                },

                _refreshTaskList: function () {
                    this.getInboxAPI().updateTask("NA", this.getTaskInstanceID());
                },
            }
        );
    }
);
