
// panelFiltrosComponent.js
panelFiltroCtrl.$inject = ['$scope'];
function panelFiltroCtrl($scope) {

    $scope.dtFecha = { opened: false };
    $scope.openPopUpdtFecha = function () {
        $scope.dtFecha.opened = true;
    };

}

var panelFiltrosComponent =
{
    bindings:{},
    controller: panelFiltroCtrl,
    templateUrl:'/DesktopModules/Facture.Templates.Crud/partials/panel-filtro.html',
};


// panelTablaComponent.js
panelTablaCtrl.$inject = ['$scope', '$filter','$Resource'];
function panelTablaCtrl($scope, $filter, $Resource) {

    var self = this;
    var ctrl = $scope;

    self.displayed = [];
    self.heroes = ['Batman', 'Superman', 'Robin', 'Thor', 'Hulk', 'Niki Larson', 'Stark', 'Bob Leponge'];
    self.configFieldChooser = { showFieldChooser: false };
   

    self.eliminarRow = function (row) {
        if (confirm("Está Seguro?")) {
            console.log(row);
            var indiceObjectoEliminar = -1;
            for (var i = 0; i < $scope.displayed.length; i++) {
                var oldRow = $scope.displayed[i].oldRow;
                //buscamos si es la misma row                  
                if (JSON.stringify($scope.displayed[i]) === JSON.stringify(row)) {
                    indiceObjectoEliminar = i;
                }
            }
            if (indiceObjectoEliminar >= 0) {
                $scope.displayed.splice(indiceObjectoEliminar, 1)
            }
        }
    };

    self.guardarCambios = function (row, fnFinalizarEditMode) {
        if (confirm("esta Seguro?"))
            fnFinalizarEditMode();
    }

    self.selecionarfila = function (row) {
        alert("fila seleccionada " + JSON.stringify(row));
    }

    self.callServer = function callServer(tableState) {

            ctrl.isLoading = true;

            var pagination = tableState.pagination;

            var start = pagination.start || 0;     // This is NOT the page number, but the index of item in the list that you want to use to display the table.
            var number = pagination.number || 10;  // Number of entries showed per page.

            $Resource.getPage(start, number, tableState).then(function (result) {
            ctrl.displayed = result.data;
        
            tableState.pagination.numberOfPages = result.numberOfPages;//set the number of pages so the pagination can update
            ctrl.isLoading = false;
            });
    }
    
    function createRandomItem(id) {
        var heroes = ['Batman', 'Superman', 'Robin', 'bhor', 'bulk', 'Niki Larson', 'Batman retorna', 'Bob Leponge'];
        var dia1 = new Date();
        var dia2 = new Date();
        dia2.setDate(dia2.getDate() + 2);

        return {
            id: id,
            name: heroes[Math.floor(Math.random() * 7)],
            apellido: heroes[Math.floor(Math.random() * 7)],
            age: Math.floor(Math.random() * 1000),
            saved: Math.floor(Math.random() * 10000),
            saved2: Math.floor(Math.random() * 10000),
            saved3: Math.floor(Math.random() * 10000),
            saved4: Math.floor(Math.random() * 10000),
            Fecha: Math.floor(Math.random() * 7) < 5 ? dia1.toLocaleDateString() : dia2.toLocaleDateString()
        };

    }

    for (var i = 0; i < 1000; i++) {
        self.displayed.push(createRandomItem(i));
    }

}

var PanelTablaComponet = {
    bindings:{},
    controller: panelTablaCtrl,
    templateUrl:'/DesktopModules/Facture.Templates.Crud/partials/panel-tabla.html',
}


// Servicio.js
Resource.$inject = ['$q', '$filter', '$timeout'];
function Resource ($q, $filter, $timeout) {

    var randomsItems = [];

    function createRandomItem(id) {
        var heroes = ['Batman', 'Superman', 'Robin', 'Thor', 'Hulk', 'Niki Larson', 'Stark', 'Bob Leponge'];
        var dia1 = new Date();
        var dia2 = new Date();
        dia2.setDate(dia2.getDate() + 2);

        return {
            id: id,
            name: heroes[Math.floor(Math.random() * 7)],
            age: Math.floor(Math.random() * 1000),
            saved: Math.floor(Math.random() * 10000),
            saved2: Math.floor(Math.random() * 10000),
            saved3: Math.floor(Math.random() * 10000),
            saved4: Math.floor(Math.random() * 10000),
            Fecha: Math.floor(Math.random() * 7) < 5 ? dia1.toLocaleDateString() : dia2.toLocaleDateString()
        };

    }

    for (var i = 0; i < 1000; i++) {
        randomsItems.push(createRandomItem(i));
    }

    //fake call to the server, normally this service would serialize table state to send it to the server (with query parameters for example) and parse the response
    //in our case, it actually performs the logic which would happened in the server
    function getPage(start, number, params) {
        console.log("llamando al servicios resource");
        var deferred = $q.defer();
      
        var filtered = params.search.predicateObject ? $filter('filter')(randomsItems, params.search.predicateObject) : randomsItems;

        if (params.sort.predicate) {
            filtered = $filter('orderBy')(filtered, params.sort.predicate, params.sort.reverse);
        }

        var result = filtered.slice(start, parseFloat(start) + parseFloat(number));

        $timeout(function () {
            //note, the server passes the information about the data set size
            deferred.resolve({
                data: result,
                numberOfPages: Math.ceil(filtered.length / number)
            });
        }, 10);


        return deferred.promise;
    }

    return {
        getPage: getPage
    };

};


// app.js
var app = angular.module('myApp', ['smart-table', 'ngAnimate', 'ngSanitize', 'ui.bootstrap']);

app
.component('panelFiltros',panelFiltrosComponent)
.component('panelTabla',PanelTablaComponet)
.factory('$Resource',Resource); 