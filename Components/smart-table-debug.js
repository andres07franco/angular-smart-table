/** 
* @version 2.0.1
* @license MIT
*/
(function (ng, undefined) {
    'use strict';

    ng.module('smart-table', []).run(['$templateCache', function ($templateCache) {

        $templateCache.put('template/smart-table/pagination.html',
             '<nav ng-if="pages.length >= 1"><ul class="pagination">' +
                '<li><a ng-click="selectPage(1)">&lt;&lt;</a></li>' +
                '<li><a ng-click="selectPage(currentPage - 1)">&lt;</a></li>' +
                '<li ng-repeat="page in pages" ng-class="{active: page==currentPage}"><a ng-click="selectPage(page)">{{page}}</a></li>' +
                '<li><a ng-click="selectPage(currentPage + 1)">&gt;</a> </li>' +
                '<li><a ng-click="selectPage(numPages)">&gt;&gt;</a></li>' +
                 '<li><a ng-click="selectPage(numPages)">Items Por Página</a></li>' +
                 '<li><select ng-model="sizePages" ng-change="setPageSize(sizePages)" ng-options="item for item in sizePageOptions"></select></li>' +
             '</ul></nav> ');

    }]);


    ng.module('smart-table')
      .constant('stConfig', {
          pagination: {
              template: 'template/smart-table/pagination.html',
              itemsByPage: 10,
              displayedPages: 5,
              sizePages:"10,20,30,50"
          },
          search: {
              delay: 400 // ms
          },
          select: {
              mode: 'single',
              selectedClass: 'st-selected'
          },
          sort: {
              ascentClass: 'st-sort-ascent',
              descentClass: 'st-sort-descent'
          }
      });
    ng.module('smart-table')
      .controller('stTableController', ['$scope', '$parse', '$filter', '$attrs', function StTableController($scope, $parse, $filter, $attrs) {
          var propertyName = $attrs.stTable;
          var displayGetter = $parse(propertyName);
          var displaySetter = displayGetter.assign;
          var safeGetter;
          var orderBy = $filter('orderBy');
          var filter = $filter('filter');
          var safeCopy = copyRefs(displayGetter($scope));
          var filterPatterns = [];
		 
          var tableState = {
              sort: {},
              search: {},
              pagination: {
                  start: 0
              }
          };
          var filtered;
          var pipeAfterSafeCopy = true;
          var ctrl = this;
          var lastSelected;

          function copyRefs(src) {
              return src ? [].concat(src) : [];
          }

          function updateSafeCopy() {
              safeCopy = copyRefs(safeGetter($scope));
              if (pipeAfterSafeCopy === true) {
                  ctrl.pipe();
              }
          }

          if ($attrs.stSafeSrc) {
              safeGetter = $parse($attrs.stSafeSrc);
              $scope.$watch(function () {
                  var safeSrc = safeGetter($scope);
                  return safeSrc ? safeSrc.length : 0;

              }, function (newValue, oldValue) {
                  if (newValue !== safeCopy.length) {
                      updateSafeCopy();
                  }
              });
              $scope.$watch(function () {
                  return safeGetter($scope);
              }, function (newValue, oldValue) {
                  if (newValue !== oldValue) {
                      updateSafeCopy();
                  }
              });
          }


          this.setFilterPatterns = function(patterns)
          {
            //  console.log("patterns "+patterns);
                 filterPatterns   = patterns;
          };

          /**
           * sort the rows
           * @param {Function | String} predicate - function or string which will be used as predicate for the sorting
           * @param [reverse] - if you want to reverse the order
           */
          this.sortBy = function sortBy(predicate, reverse) {
              tableState.sort.predicate = predicate;
              tableState.sort.reverse = reverse === true;

              if (ng.isFunction(predicate)) {
                  tableState.sort.functionName = predicate.name;
              } else {
                  delete tableState.sort.functionName;
              }

              tableState.pagination.start = 0;
              return this.pipe();
          };

          /**
           * search matching rows
           * @param {String} input - the input string
           * @param {String} [predicate] - the property name against you want to check the match, otherwise it will search on all properties
           */
          this.search = function search(input, predicate) {
            
              var predicateObject = tableState.search.predicateObject || {};
              var prop = predicate ? predicate : '$';
               
              input = ng.isString(input) ? input.trim() : input;
              predicateObject[prop] = input;
            
              // to avoid to filter out null value
              if (!input) {
                  delete predicateObject[prop];
              }
              tableState.search.predicateObject = predicateObject;
      
              tableState.pagination.start = 0;
              return this.pipe();
          };

          /**
           * this will chain the operations of sorting and filtering based on the current table state (sort options, filtering, ect)
           */
          this.pipe = function pipe() {
              var pagination = tableState.pagination;
              var output;
            //  console.log(tableState.search.predicateObject);
            //  console.log(this.filterPatterns);
              //  filtered = tableState.search.predicateObject ? filter(safeCopy, tableState.search.predicateObject) : safeCopy;
              filtered = tableState.search.predicateObject ? filter(safeCopy, this.customFilters(tableState.search.predicateObject, this.filterPatterns)) : safeCopy;
              
              if (tableState.sort.predicate) {
                  filtered = orderBy(filtered, tableState.sort.predicate, tableState.sort.reverse);
              }
              if (pagination.number !== undefined) {
                  pagination.numberOfPages = filtered.length > 0 ? Math.ceil(filtered.length / pagination.number) : 1;
                  pagination.start = pagination.start >= filtered.length ? (pagination.numberOfPages - 1) * pagination.number : pagination.start;
                  output = filtered.slice(pagination.start, pagination.start + parseInt(pagination.number));
              }
               displaySetter($scope, output || filtered);
          };

          /**
           * search matching rows
           * @params {String} input - the input string
           * @filterPatterns {String} [predicate] - the property name against you want to check the match, otherwise it will search on all properties
           */
            this.customFilters = function(parmas, filterPatterns){

                    return function(row) {
                        var sw = true;

                        for (var fieldName in parmas) {

                            var campo = row[fieldName] + "".toLowerCase() + ""; 
                            var filtrado = parmas[fieldName] + "".toLowerCase() + ""; //valor de busqueda

                            switch(filterPatterns[fieldName]) {
                                case "Contains":
                                    sw = sw && (campo.indexOf(filtrado) >= 0);
                                    break;
                                case "NoContains":
                                    sw = sw && (campo.indexOf(filtrado) == -1);
                                    break;
                                case "StartWith":
                                    sw = sw && (campo.indexOf(filtrado) === 0);
                                    break;
                                case "EndtWith":
                                    sw = sw && (campo.indexOf(filtrado) != -1 && campo.indexOf(filtrado) === (campo.length - filtrado.length));
                                    break;
                                case "Equals":
                                    sw = sw && (campo == filtrado);
                                    break;
                                case "NoEquals":
                                    sw = sw && (campo != filtrado);
                                    break; 
                                case "IsLessThan":
                                    sw = sw && (campo > filtrado);
                                    break; 
                                case "IsGreaterThan":
                                    sw = sw && (campo < filtrado);
                                    break;
                                case "IsLessThanOrEqualTo":
                                    sw = sw && (campo >= filtrado);
                                    break;
                                case "IsGreaterThanOrEqualTo":
                                    sw = sw && (campo <= filtrado);
                                    break;
                            }

                         }
                            
                        return sw ;
                        
                    }
                };

          /**
           * select a dataRow (it will add the attribute isSelected to the row object)
           * @param {Object} row - the row to select
           * @param {String} [mode] - "single" or "multiple" (multiple by default)
           */
          this.select = function select(row, mode) {
		 
              var rows = safeCopy;
              var index = rows.indexOf(row);
			   
              //if (index !== -1) {
                  if (mode === 'single') {
                      row.isSelected = row.isSelected !== true;
                      if (lastSelected) {
                          lastSelected.isSelected = false;
                      }
                      lastSelected = row.isSelected === true ? row : undefined;
                  } else {
                     // rows[index].isSelected = !rows[index].isSelected;
                     row.isSelected = !row.isSelected;
                  }
             // }
          };

          /**
           * take a slice of the current sorted/filtered collection (pagination)
           *
           * @param {Number} start - start index of the slice
           * @param {Number} number - the number of item in the slice
           */
          this.slice = function splice(start, number) {
              tableState.pagination.start = start;
              tableState.pagination.number = number;
              return this.pipe();
          };

          /**
           * return the current state of the table
           * @returns {{sort: {}, search: {}, pagination: {start: number}}}
           */
          this.tableState = function getTableState() {
              return tableState;
          };

          this.getFilteredCollection = function getFilteredCollection() {
              return filtered || safeCopy;
          };

          /**
           * Use a different filter function than the angular FilterFilter
           * @param filterName the name under which the custom filter is registered
           */
          this.setFilterFunction = function setFilterFunction(filterName) {
              filter = $filter(filterName);
          };

          /**
           * Use a different function than the angular orderBy
           * @param sortFunctionName the name under which the custom order function is registered
           */
          this.setSortFunction = function setSortFunction(sortFunctionName) {
              orderBy = $filter(sortFunctionName);
          };

          /**
           * Usually when the safe copy is updated the pipe function is called.
           * Calling this method will prevent it, which is something required when using a custom pipe function
           */
          this.preventPipeOnWatch = function preventPipe() {
              pipeAfterSafeCopy = false;
          };
      }])
      .directive('stTable', function () {
          return {
              restrict: 'A',
              controller: 'stTableController',

              link: function (scope, element, attr, ctrl) {

                  if (attr.stSetFilter) {
                      ctrl.setFilterFunction(attr.stSetFilter);
                  }

                  if (attr.stSetSort) {
                      ctrl.setSortFunction(attr.stSetSort);
                  }

                  if(scope.filterPatterns){
                      ctrl.filterPatterns = stFilterPatterns;
                  }
              }
          };
      });

    ng.module('smart-table')
      .directive('stFilterPatterns', function () {
          return {
              require: '^stTable',
              scope:{
                    stFilterPatterns:'='
              },
              link: function (scope, element, attr, ctrl) {

                  if(scope.stFilterPatterns){
                      
                      ctrl.filterPatterns = scope.stFilterPatterns;
                  
                  }
              }
          };
      });

    ng.module('smart-table')
      .directive('stSearch', ['stConfig', '$timeout', function (stConfig, $timeout) {
          return {
              require: '^stTable',
              link: function (scope, element, attr, ctrl) {
                  var tableCtrl = ctrl;
                  var promise = null;
                  var throttle = attr.stDelay || stConfig.search.delay;

                  attr.$observe('stSearch', function (newValue, oldValue) {
                      
                      var input = element[0].value;
                    
                      if (newValue !== oldValue && input) {
                          ctrl.tableState().search = {};
                          tableCtrl.search(input, newValue);
                      }
                  });

                  //table state -> view
                  scope.$watch(function () {
                      return ctrl.tableState().search;
                  }, function (newValue, oldValue) {
                     
                      var predicateExpression = attr.stSearch || '$';
                      if (newValue.predicateObject && newValue.predicateObject[predicateExpression] !== element[0].value) {
                          element[0].value = newValue.predicateObject[predicateExpression] || '';
                      }
                  }, true);

                  // view -> table state
                
                  element.bind('input', function (evt) {
                    
                      evt = evt.originalEvent || evt;
                      if (promise !== null) {
                          $timeout.cancel(promise);
                      }

                      promise = $timeout(function () {
                         
                          tableCtrl.search(evt.target.value, attr.stSearch || '');
                          promise = null;
                      }, throttle);
                  });

              }
          };
      }]);

    ng.module('smart-table')
      .directive('stSelectRow', ['stConfig', function (stConfig) {
          return {
              restrict: 'A',
              require: '^stTable',
              scope: {
                  row: '=stSelectRow',
                  stOnSelectRow:'='
              },
              link: function (scope, element, attr, ctrl) {
			
                  var mode = attr.stSelectMode || stConfig.select.mode;
				
                  element.bind('click', function () {
				   

                      scope.$apply(function () {
                          ctrl.select(scope.row, mode);
                      });

                      if (scope.stOnSelectRow && scope.row.isSelected && !scope.row.isEditMode)
                    {
                        scope.stOnSelectRow(scope.row);
                    }
                  });

                  scope.$watch('row.isSelected', function (newValue) {
                      if (newValue === true) {
                          element.addClass(stConfig.select.selectedClass);
                      } else {
                          element.removeClass(stConfig.select.selectedClass);
                      }
                  });
              }
          };
      }]);

    ng.module('smart-table')
      .directive('stSort', ['stConfig', '$parse', function (stConfig, $parse) {
          return {
              restrict: 'A',
              require: '^stTable',
              link: function (scope, element, attr, ctrl) {

                  var predicate = attr.stSort;
                  var getter = $parse(predicate);
                  var index = 0;
                  var classAscent = attr.stClassAscent || stConfig.sort.ascentClass;
                  var classDescent = attr.stClassDescent || stConfig.sort.descentClass;
                  var stateClasses = [classAscent, classDescent];
                  var sortDefault;

                  if (attr.stSortDefault) {
                      sortDefault = scope.$eval(attr.stSortDefault) !== undefined ? scope.$eval(attr.stSortDefault) : attr.stSortDefault;
                  }

                  //view --> table state
                  function sort() {
                      index++;
                      predicate = ng.isFunction(getter(scope)) ? getter(scope) : attr.stSort;
                      if (index % 3 === 0 && attr.stSkipNatural === undefined) {
                          //manual reset
                          index = 0;
                          ctrl.tableState().sort = {};
                          ctrl.tableState().pagination.start = 0;
                          ctrl.pipe();
                      } else {
                          ctrl.sortBy(predicate, index % 2 === 0);
                      }
                  }

                  element.bind('click', function sortClick() {
                      if (predicate) {
                          scope.$apply(sort);
                      }
                  });

                  if (sortDefault) {
                      index = sortDefault === 'reverse' ? 1 : 0;
                      sort();
                  }

                  //table state --> view
                  scope.$watch(function () {
                      return ctrl.tableState().sort;
                  }, function (newValue) {
                      if (newValue.predicate !== predicate) {
                          index = 0;
                          element
                            .removeClass(classAscent)
                            .removeClass(classDescent);
                      } else {
                          index = newValue.reverse === true ? 2 : 1;
                          element
                            .removeClass(stateClasses[index % 2])
                            .addClass(stateClasses[index - 1]);
                      }
                  }, true);
              }
          };
      }]);

    ng.module('smart-table')
      .directive('stPagination', ['stConfig', function (stConfig) {
          return {
              restrict: 'EA',
              require: '^stTable',
              scope: {
                  stItemsByPage: '=?',
                  stDisplayedPages: '=?',                  
                  stPageChange: '&'
              },
              templateUrl: function (element, attrs) {
                  if (attrs.stTemplate) {
                      return attrs.stTemplate;
                  }
                  return stConfig.pagination.template;
              },
              link: function (scope, element, attrs, ctrl) {
                  
                 
                  scope.stItemsByPage = scope.stItemsByPage ? +(scope.stItemsByPage) : stConfig.pagination.itemsByPage;
                  scope.stDisplayedPages = scope.stDisplayedPages ? +(scope.stDisplayedPages) : stConfig.pagination.displayedPages;
                  scope.stSizePages = attrs.stSizePages ? attrs.stSizePages : stConfig.pagination.sizePages;
             
                  scope.sizePageOptions = scope.stSizePages.replace("'", "").replace("'", "").split(',');
                  scope.sizePages = scope.sizePageOptions[0];
                  scope.currentPage = 1;
                  scope.pages = [];

                  function redraw() {
                      var paginationState = ctrl.tableState().pagination;
                      var start = 1;
                      var end;
                      var i;
                      var prevPage = scope.currentPage;
                      scope.currentPage = Math.floor(paginationState.start / paginationState.number) + 1;

                      start = Math.max(start, scope.currentPage - Math.abs(Math.floor(scope.stDisplayedPages / 2)));
                      end = start + scope.stDisplayedPages;

                      if (end > paginationState.numberOfPages) {
                          end = paginationState.numberOfPages + 1;
                          start = Math.max(1, end - scope.stDisplayedPages);
                      }

                      scope.pages = [];
                      scope.numPages = paginationState.numberOfPages;

                      for (i = start; i < end; i++) {
                          scope.pages.push(i);
                      }

                      if (prevPage !== scope.currentPage) {
                          scope.stPageChange({ newPage: scope.currentPage });
                      }
                  }

                  //table state --> view
                  scope.$watch(function () {
                      return ctrl.tableState().pagination;
                  }, redraw, true);

                  //scope --> table state  (--> view)
                  scope.$watch('stItemsByPage', function (newValue, oldValue) {
                      if (newValue !== oldValue) {
                          scope.selectPage(1);
                      }
                  });

                  scope.$watch('stDisplayedPages', redraw);

                  scope.setPageSize = function (page) {
                     
                      scope.stItemsByPage = page;
                    
                  };

                  //view -> table state
                  scope.selectPage = function (page) {
                      if (page > 0 && page <= scope.numPages) {
                          ctrl.slice((page - 1) * scope.stItemsByPage, scope.stItemsByPage);
                      }
                  };

                  if (!ctrl.tableState().pagination.number) {
                      ctrl.slice(0, scope.stItemsByPage);
                  }
				 
				
              }
          };
      }]);

    ng.module('smart-table')
      .directive('stPipe', function () {
          return {
              require: '^stTable',
              scope: {
                  stPipe: '='
              },
              link: {

                  pre: function (scope, element, attrs, ctrl) {
                    
                      if (ng.isFunction(scope.stPipe)) {
                          ctrl.preventPipeOnWatch();
                          ctrl.pipe = function () {
                              return scope.stPipe(ctrl.tableState(), ctrl);
                          }
                      }
                  },

                  post: function (scope, element, attrs, ctrl) {
                     ctrl.pipe();
                  }
              }
          };
      });

    function isJqueryEventDataTransfer(){
        return window.jQuery && (-1 == window.jQuery.event.props.indexOf('dataTransfer'));
    }

    if (isJqueryEventDataTransfer()) {
        window.jQuery.event.props.push('dataTransfer');
    }


    /*DRag and drop*/

    ng.module('smart-table').service('lrDragStore', ['$document', function (document) {

        var store = {};

        this.hold = function hold(key, item, collectionFrom, safe) {
            store[key] = {
                item: item,
                collection: collectionFrom,
                safe: safe === true
            }
        };

        this.get = function (namespace) {
            var
                modelItem = store[namespace], itemIndex;

            if (modelItem) {
                itemIndex = modelItem.collection.indexOf(modelItem.item);
                return modelItem.safe === true ? modelItem.item : modelItem.collection.splice(itemIndex, 1)[0];
            } else {
                return null;
            }
        };

        this.clean = function clean() {
            store = {};
        };

        this.isHolding = function (namespace) {
            return store[namespace] !== undefined;
        };

        document.bind('dragend', this.clean);
    }]);

    ng.module('smart-table').service('lrDragHelper', function () {
        var th = this;

        th.parseRepeater = function(scope, attr) {
            /*var
                repeatExpression = attr.ngRepeat,
                match;

            if (!repeatExpression) {
                throw Error('this directive must be used with ngRepeat directive');
            }
            match = repeatExpression.match(/^(.*\sin).(\S*)/);
            if (!match) {
                throw Error("Expected ngRepeat in form of '_item_ in _collection_' but got '" +
                    repeatExpression + "'.");
            }

            return scope.$eval(match[2]);*/
			return scope.fields
        };

        th.lrDragSrcDirective = function(store, safe) {
            return function compileFunc(el, iattr) {
                if (!$(el).hasClass("emptyChooser")) {
                    iattr.$set('draggable', true);
                }
                console.log(iattr);
                return function linkFunc(scope, element, attr) {
                    var
                        collection,
                        key = (safe === true ? attr.lrDragSrcSafe : attr.lrDragSrc ) || 'temp';

                    if (attr.lrDragData) {  // no entra no mande atributo                    
                        scope.$watch(attr.lrDragData, function (newValue) {
                            collection = newValue;
                        });
                    } else {                        
                        collection = th.parseRepeater(scope, attr);
                    }

                    element.bind('dragstart', function (evt) {
                        store.hold(key, collection[scope.$index], collection, safe);
                       if(angular.isDefined(evt.dataTransfer)) {
                            evt.dataTransfer.setData('text/html', null); //FF/jQuery fix
                        }
                    });
                }
            }
        }
    });

    ng.module('smart-table').directive('lrDragSrc', ['lrDragStore', 'lrDragHelper', function (store, dragHelper) {
        return{
            compile: dragHelper.lrDragSrcDirective(store)
        };
    }]);

    ng.module('smart-table').directive('lrDragSrcSafe', ['lrDragStore', 'lrDragHelper', function (store, dragHelper) {
        return{
            compile: dragHelper.lrDragSrcDirective(store, true)
        };
    }]);

    ng.module('smart-table').directive('lrDropTarget', ['lrDragStore', 'lrDragHelper', '$parse', '$smartTableService', function (store, dragHelper, $parse, $smartTableService) {
        return {
            link: function (scope, element, attr) {

                var
                    collection,
                    key = attr.lrDropTarget || 'temp',
                    classCache = null;

                function isAfter(x, y) {
                    //check if below or over the diagonal of the box element
                //    console.log("element[0].offsetHeight: " + element[0].offsetHeight + " x=" + x + " element[0].offsetWidth=" + element[0].offsetWidth + " y=" + y);
                    return (element[0].offsetHeight - x * element[0].offsetHeight /  element[0].offsetWidth) < y;
                }

                function resetStyle() {
                    if (classCache !== null) {
                        element.removeClass(classCache);
                        classCache = null;
                    }
                }

                if(attr.lrDragData) {
                    scope.$watch(attr.lrDragData, function (newValue) {
                        collection = newValue;
                    });
                } else {
                    collection = dragHelper.parseRepeater(scope, attr);
                }

                element.bind('drop', function (evt) {
     
	 
				    var visibles = scope.$parent.$parent.visibles;
					var scopeTagSmartTable = scope.$parent.$parent;
					var countFieldVisibles = $smartTableService.countVisibles(scopeTagSmartTable.visibles);
					
					
					//si hay una sola columna en la grilla no debe permitir agregar columnas al selector de campos
					if (countFieldVisibles == 1 && element.parent().hasClass("selectorField")) {
						return;
					}
							
                    var
                        collectionCopy = ng.copy(collection);

                    var
                        item = store.get(key),
                        dropIndex, i, l;
         
                    if (item !== null) {
                        dropIndex = scope.$index;
                     
                        dropIndex = isAfter(evt.offsetX, evt.offsetY) ? dropIndex + 1 : dropIndex;
                        //srcCollection=targetCollection => we may need to apply a correction
                        if (collectionCopy.length > collection.length) {


							
                           //camf(2016-10-7) dependiendo del padre se coloca o no visible
                            if (element.parent().hasClass("selectorField")) {
                                scopeTagSmartTable.visibles[item] = false;
                            }
                            else {
                                scopeTagSmartTable.visibles[item] = true;
                            }

                            //se valida si hay campos en el fieldchooser, para mostrar el adicionar campos
							countFieldVisibles = $smartTableService.countVisibles(scopeTagSmartTable.visibles);
                            scopeTagSmartTable.showAddField = countFieldVisibles == Object.keys(scopeTagSmartTable.titles).length - 1;
                         
                            if (scopeTagSmartTable.showAddField) {
                                visibles['addFieldChooser'] = true;
                            }
                            else
                            {
                                visibles['addFieldChooser'] = false;
                            }
        
                            
                            for (i = 0, l = Math.min(dropIndex, collection.length - 1); i <= l; i++) {
                                if (!ng.equals(collectionCopy[i], collection[i])) {
                                    dropIndex = dropIndex - 1;
                                    break;
                                }
                            }
                           
                        }
                        scope.$apply(function () {
                            collection.splice(dropIndex, 0, item);
                            var fn = $parse(attr.lrDropSuccess) || ng.noop;
                            fn(scope, {e: evt, item: item, collection: collection});
                        });

 
                        evt.preventDefault();
                        resetStyle();
                        store.clean();


                    }
                });

                element.bind('dragleave', resetStyle);

                element.bind('dragover', function (evt) {
                    var className;
                    if (store.isHolding(key)) {
                        className = isAfter(evt.offsetX, evt.offsetY) ? 'lr-drop-target-after' : 'lr-drop-target-before';
                        if (classCache !== className && classCache !== null) {
                            element.removeClass(classCache);
                        }
                        if (classCache !== className) {
                            element.addClass(className);
                        }
                        classCache = className;
                    }
                    evt.preventDefault();
                });
            }
        };
    }]);
   
    ng.module('smart-table').filter('unique', function() {
        return function (arr, field) {
            var o = {}, i, l = arr.length, r = [];
            for(i=0; i<l;i+=1) {
                o[arr[i][field]] = arr[i];
            }
            for(i in o) {
                r.push(o[i]);
            }
            return r;
        };
    })

    /*Smart table*/

    ng.module('smart-table').directive('smartTable', ['$smartTableService', function ($smartTableService) {

        var templateUrl = "/DesktopModules/Facture.Templates.Crud/grid-template.html?id=s" + Math.floor(Math.random() * 1000);
    return {
      restrict: 'E',
      transclude: true,
      scope: {
        data: '='  ,
        call: '=' ,
        onSaveChange: '=',
        onSelectRow: '=',
        configFieldChooser: '='
	  },      
      templateUrl: templateUrl,
	  link:function(scope, element, attrs, tabsCtrl)
	  {
                      
            scope.showEditColumn = attrs.showEditColumn== "true"?true:false;
			scope.cssclass = attrs.cssclass;
			scope.draggable = attrs.columnDraggable == "true" ? true : false;
			
            scope.selectable = attrs.selectable == "true"?true:false;
            //deafult value selectable 
            if (scope.selectable)
            {

                    scope.selectionMode = "multiple";
                    scope.selectionModeSingle = false;
                    scope.selectionModeMultiple = true;
            
                    scope.selectionWithCheckcolumn = attrs.selectionWithCheckcolumn == "true"?true:false;
                    if(attrs.selectionMode)
                    {
                        scope.selectionMode = attrs.selectionMode ;
                        scope.selectionModeSingle = attrs.selectionMode == "single"?true:false;
                        scope.selectionModeMultiple= attrs.selectionMode == "multiple"?true:false;
                    };

            }
            
	  },
      controller: ['$scope','$filter', function MyTabsController($scope,$filter) {
        
		//inicializando caampos
        var fields = $scope.fields = [];	
		var titles = $scope.titles = [];
		var filters = $scope.filters = [];
        var visibles  = $scope.visibles  = [];
        var filtersControls = $scope.filtersControls = [];
        var filtersSelectlOption = $scope.filtersSelectlOption = [];
        var filtersDatePickerConf = $scope.filtersDatePickerConf = [];
        var sorters = $scope.sorters = [];
        var editModes = $scope.editModes = [];
		var formats = $scope.formats = [];
		var aligns = $scope.aligns = [];
		var filtersShowOptions = $scope.filtersShowOptions = [];	
        var filtersDefaultPattern = $scope.filtersDefaultPattern = [];	

        var columnsButtons = $scope.columnsButtons = [];          
		var showfilters = $scope.showfilters = false;	
		var buttonsClicks = $scope.buttonsClicks = [];

		if ($scope.configFieldChooser) {
		    $scope.configFieldChooser.height = 200;
		    var field =  "addFieldChooser";
		    fields.push(field);
		    visibles[field] = false;
		    titles[field] = "addFieldChooser";
		}

		$scope.showAddField = false;       
        $scope.checkAll = false;
        $scope.innerJoinRow = [];
        $scope.isTableparentChild = false;
		//inicializando paginacion
		$scope.displayedPages = 3;
		$scope.itemsByPage =  10;
		$scope.sizePages = '10,20,50';
		  
		this.addFields = function (field, title, filter, sorter, editMode, isColumnButton, 
                                   buttonClick, format, align, visible,filterControl,
                                   filterSelectOption,filterShowOptions,filterDefaultPattern) 
        {

            fields.push(field);
           
            titles[field] = title?title:field;
            filters[field] = filter;
            sorters[field] = sorter ? field : "";
            if (filter) {
                $scope.showfilters = true;
            }
            editModes[field] = editMode == "false"?false:true;
            columnsButtons[field]  = isColumnButton;  
            buttonsClicks[field]   = buttonClick;			
			formats[field] = format;
			aligns[field] = align;
			visibles[field] = visible == "false" ? false : true;

			$scope.showAddField = $smartTableService.countVisibles(visibles) == Object.keys(titles).length;
            
			if (filterControl != 'text' && filterControl != 'select' && filterControl != 'uib-datepicker' && filterControl != 'number')
            {
                filterControl = 'text';
            }
            if(filterControl == 'uib-datepicker' )
            {                
                filtersDatePickerConf[field] ={opened :  false}
            }

			filtersControls[field]   = filterControl;
			filtersSelectlOption[field] = filterControl == 'select' ? filterSelectOption : {};
			

		    filtersShowOptions[field]	  = filterShowOptions=="false"?false:true;
		    filtersDefaultPattern[field] = filterDefaultPattern ? filterDefaultPattern : (filterControl == "number" || filterControl == "uib-datepicker" ? "Equals" : "Contains");


		    
           
        };
		
        $scope.openPopUpdtFecha = function(field){             
                        filtersDatePickerConf[field].opened = true;                           
        };

		this.setPaginationConfig = function(pdisplayedPages,pitemsByPage,psizePages) {
			 $scope.displayedPages = pdisplayedPages;
			 $scope.itemsByPage    = pitemsByPage,
			 $scope.sizePages      = psizePages;				 
        };

         $scope.formatField = function(value,format)
         {
			if(format != '' && format != undefined){
				var val = value;
				var split = format.split(':'); // $filter('currency')(amount, symbol, fractionSize) - $filter('number')(number, fractionSize) $filter('date')(date, format, timezone)
				var typeFormat = split[0]?split[0].trim():'';
				switch(typeFormat){
					case 'currency': 
									var symbol         = split[1]?split[1]:'';
									var fractionSize   = split[2]?split[2]:'0'; 
									val = $filter('currency')(value, symbol, fractionSize) ;
									break;
					case 'number'  :
									var fractionSize   = split[1]?split[1]:'0'; 
									val = $filter('number')(value, fractionSize) ;
									break;
					case 'date'    : 
									var formatdate   = split[1]?split[1]:'dd/MM/yyyy HH:mm:ss Z'; 
									val = $filter('date')(new Date(value), formatdate);
									break;
				}
				return val;
			}
					
             return   value ;           
         }
		 
         $scope.checkedAll = function()
         {
             $scope.checkAll = !$scope.checkAll;
               for (var i = 0; i < $scope.data.length; i++) {
                   $scope.data[i].isSelected =  $scope.checkAll;
               }                
         }

         $scope.saveChange = function(row)
         {
             if($scope.onSaveChange){
                $scope.onSaveChange(row,function(){row.isEditMode = false;});
             }else{
                    row.isEditMode = false;
             }
               
                             
         }

         $scope.cancelChange = function(row)
         {     
             row.isEditMode = false;               
               for (var i = 0; i < $scope.innerJoinRow.length; i++) {  
                    var oldRow  = $scope.innerJoinRow[i].oldRow  ;
                    //buscamos si es la misma row                  
                    if( JSON.stringify($scope.innerJoinRow[i].row) === JSON.stringify(row) )
                    {
                        //desacemos cambios
                        for (var j = 0; j < $scope.fields.length; j++) {                                     
                                 row[fields[j]] = oldRow[fields[j]];                   
                        }   
                    }
                                    
               }   
                                  
         }  

         $scope.changeEditMode = function(row){
               var oldRow=[];
               //copiamos datos
               for (var i = 0; i < $scope.fields.length; i++) {                                     
                       oldRow[fields[i]] = row[fields[i]];                   
               }   
               //relacionamos valores viejos con los proximos valores nuevos             
               $scope.innerJoinRow.push({row:row,oldRow:oldRow});
               row.isEditMode = true;                 
         }                  

          //Un poco de frito, mejorar en v2
         $scope.triggerInputByID = function (id) {
             $("#" + id).trigger("input");
             
         }

         $scope.SelectFilterType = function(field,filterType)
         {
             filtersDefaultPattern[field] = filterType;
             $("#dt" + field).trigger("input");
         }

      }]
    };
  }]);

    ng.module('smart-table').directive('smartColumns', function () {
    return {
        require: '^^smartTable',
        restrict: 'E',
        transclude: true,
        scope: {
        },
        link: function(scope, element, attrs, tabsCtrl) {
		//alert("smartColumns" );
        },
        template: '<div ng-transclude></div>'
    };
    })

    ng.module('smart-table').directive('smartColumn', function () {
    return {
        require: '^^smartTable',
        restrict: 'E',
        scope: {
        title: '@',
		field: '@',
		filter:'@',
        sorter:'@',
        editMode:'@',
        format: '@',
        visible: '@',
        filterControl:'@',
        filterSelectOption:'='
        },
        link: function(scope, element, attrs, tabsCtrl) {
		//alert("smartColumn");
		var filter = attrs.filter=="true"?true:false;

        tabsCtrl.addFields(
                            attrs.field,
                            attrs.title,
                            filter,
                            attrs.sorter,
                            attrs.editMode,
                            false, // indica si es una columna de comandos
							undefined
							,attrs.format
							,attrs.align
                            ,attrs.visible
                            ,attrs.filterControl
                            ,scope.filterSelectOption
                        );
        },
        template: ''
    };
    })

    ng.module('smart-table').directive('smartColumnButton', function() {
    return {
        require: '^^smartTable',
        restrict: 'E',
        scope: {
        title: '@',
		field: '@',
		filter:'@',
        sorter:'@',
        editMode:'@',
        onButtonClick: '=?',
        visible:'@'
        },
        link: function(scope, element, attrs, tabsCtrl) {
		
		var filter = attrs.filter=="true"?true:false;
        tabsCtrl.addFields(
                            attrs.field,
                            attrs.title,
                            false,  //no filtrar columnas de botones
                            attrs.sorter,
                            false, //no estan en edit mode
                            true,  // indica si es una columna de comandos,
                            scope.onButtonClick,
							'',  //format no aplica
							'center',
                            attrs.visible
                            ,undefined   //tipo de control en el filtro, no aplica
                            ,undefined  //array de opciones en el filtro, no aplica
                        );
        },
        template: ''
    };
    })

    ng.module('smart-table').directive('smartConfigPagination', function() {
    return {
        require: '^^smartTable',
        restrict: 'E',
        scope: {
        displayedPages: '@',
		itemsByPage   : '@',
		sizePages     : '@'
        },
        link: function(scope, element, attrs, tabsCtrl) {	
		tabsCtrl.setPaginationConfig(attrs.displayedPages,attrs.itemsByPage,attrs.sizePages);
        },
        template: ''
    };
    })  ;

    ng.module('smart-table')
    .service('$smartTableService', ['$document', function (document) {

        this.countVisibles =function (visibles) {

            var count = 0;

            for (var valor in visibles) {
             
                if (visibles[valor] === true && valor != 'addFieldChooser')
                {
                    count++;
                }
            }

            return count;
        }



    }]);

    ng.module('smart-table')
    .directive('smartButtonSelector', ['$compile', '$smartTableService', function ($compile, $smartTableService) {
    return {
        restrict: 'A',
        replace:true,
        scope:{
            configFieldChooser : "="
        },
        link: function(scope, element, attrs) {			
      
         
            if(!attrs.ngClick){
            
            attrs.$set('ng-click', 'onHandleClick($event)');

            $compile(element[0])(scope);
            
            scope.onHandleClick= function($event){
               // console.log($($event.currentTarget).position());
               // console.log($event.toElement);   
               
                scope.configFieldChooser.top = $($event.currentTarget).position().top - scope.configFieldChooser.height;
                scope.configFieldChooser.left = $($event.currentTarget).position().left;
                scope.configFieldChooser.showFieldChooser = !scope.configFieldChooser.showFieldChooser;
            }
            }
        }
    };
    }])  ;
  
    ng.module('smart-table').directive('smartFilterOptions', function () {
     
        return {         
            restrict: 'EA',
            scope: {
                smartFilterOptions: '=',
            },
            link: function (scope, element, attrs) {

                var html = '';

                for(var i= 0; i < scope.smartFilterOptions.length; i++ )
                {
                    html += ' <option value="' + scope.smartFilterOptions[i] + '" >' + scope.smartFilterOptions[i] + '</option>';
                }

                element.append(html);

            }

        };
    });

})(angular);