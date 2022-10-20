sap.ui.define(
    [
        "sap/ui/core/UIComponent",
        "sap/ui/Device",
        "sap/ui/model/Filter",
        "sap/ui/model/FilterOperator",
        "sap/m/MessageBox",
        "com/act/workflowuimodule/model/models",
    ],
    function (UIComponent, Device, Filter, FilterOperator, MessageBox, models) {
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
                    // this.setTestData();
                    this.getPageData();
                },
                setTestData: function () {
                    var oData = {
                        "manufacturerCode": '9000',
                        "countryCode_code": 'IT',
                        "uuid": '8e772605-538f-4fa9-9bee-49265c028771'
                    }
                    this.getModel("taskData").setProperty("/data", oData);
                },
                getPageData: async function () {
                    var oTAComment = {
                        "valueState": "None",
                        "sComment": "",
                        "valueStateText": ""
                    }
                    this.getModel("taskData").setProperty("/oComment", oTAComment);

                    var oModel = this.getModel();
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
                    if (approvalStatus) {
                        this.approveRequest();
                    } else {
                        this.rejectRequest();
                    }
                    // this._patchTaskInstance();
                    // this._refreshTaskList();
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
                approveRequest: async function () {
                    var oModel = this.getModel();
                    sap.ui.core.BusyIndicator.show();
                    var oParms = this.getModel("taskData").getProperty("/data");
                    var oActionUriParameters = {
                        uuid: oParms.uuid,
                        manufacturerCode: oParms.manufacturerCode,
                        countryCode: oParms.countryCode_code
                    };
                    var sPath = "/approveVendor";
                    const info = await this.updateRecord(sPath, oActionUriParameters);
                    if (info.approveVendor) {
                        this._patchTaskInstance();
                        this._refreshTaskList();
                    } else {
                        this.errorHandling(info);
                    }
                    sap.ui.core.BusyIndicator.hide();
                },
                rejectRequest: async function () {
                    var oParms = this.getModel("taskData").getProperty("/data");
                    var sComment = this.getModel("taskData").getProperty("/oComment/sComment");
                    if (sComment === "" || sComment === undefined) {
                        this.getModel("taskData").setProperty("/oComment/valueState", "Error");
                        this.getModel("taskData").setProperty("/oComment/valueStateText", "Please enter comment");
                        MessageBox.error("Please enter the comment to reject the request");
                    } else {
                        sap.ui.core.BusyIndicator.show();
                        var oActionUriParameters = {
                            Vendor_List_manufacturerCode: oParms.manufacturerCode,
                            Vendor_List_countryCode_code: oParms.countryCode_code,
                            Vendor_List_uuid: oParms.uuid,
                            localManufacturerCode: oParms.localManufacturerCode,
                            Comment: sComment
                        };
                        const info = await this.updateRejectRecord("/VendorComments", oActionUriParameters);
                        if (info.Vendor_List_uuid) {
                            sap.ui.core.BusyIndicator.hide();
                            this._patchTaskInstance();
                            this._refreshTaskList();
                        } else {
                            sap.ui.core.BusyIndicator.hide();
                            this.errorHandling(info);
                        }
                    }
                },
                updateRecord: function (sPath, oPayLoad) {
                    var oModel = this.getModel();
                    return new Promise(function (resolve, reject) {
                        oModel.callFunction(sPath, {
                            method: "POST",
                            urlParameters: oPayLoad,
                            success: function (oData) {
                                resolve(oData);
                            }.bind(this),
                            error: function (error) {
                                resolve(error);
                            }.bind(this)
                        });
                    }.bind(this));
                },
                updateRejectRecord: function (sPath, oPayLoad) {
                    var oModel = this.getModel();
                    return new Promise(function (resolve, reject) {
                        oModel.create(sPath, oPayLoad, {
                            success: function (oData) {
                                resolve(oData);
                            }.bind(this),
                            error: function (error) {
                                resolve(error);
                            }.bind(this)
                        });
                    }.bind(this));
                },
                errorHandling: function (responseBody) {
                    try {
                        var body = JSON.parse(responseBody.responseText);
                        var errorDetails = body.error.innererror.errordetails;
                        if (errorDetails) {
                            if (errorDetails.length > 0) {
                                var sMsg = "";
                                for (var i = 0; i < errorDetails.length; i++) {
                                    if (sMsg === "") {
                                        sMsg = errorDetails[i].message;
                                    } else {
                                        sMsg = sMsg + ", " + errorDetails[i].message;
                                    }
                                }
                                if (typeof (responseBody) === "object") {
                                    MessageBox.error(sMsg.value);
                                } else {
                                    MessageBox.error(sMsg);
                                }
                            } else
                                MessageBox.error(body.error.message.value);
                        } else
                            MessageBox.error(body.error.message.value);
                        // }
                    } catch (err) {
                        try {
                            //the error is in xml format. Technical error by framework
                            switch (typeof responseBody) {
                                case "string": // XML or simple text
                                    if (responseBody.indexOf("<?xml") > -1) {
                                        var oXML = jQuery.parseXML(responseBody);
                                        var oXMLMsg = oXML.querySelector("message");
                                        if (oXMLMsg)
                                            MessageBox.error(oXMLMsg.textContent);
                                    } else
                                        MessageBox.error(responseBody);

                                    break;
                                case "object": // Exception
                                    var oXML = jQuery.parseXML(responseBody.responseText);
                                    var oXMLMsg = oXML.querySelector("message");
                                    if (oXMLMsg) {
                                        MessageBox.error(oXMLMsg.textContent);
                                    } else {
                                        MessageBox.error(responseBody);
                                    }
                                    break;
                            }
                        } catch (err) {
                            MessageBox.error(JSON.stringify(responseBody));
                        }

                    }
                }
            }
        );
    }
);
