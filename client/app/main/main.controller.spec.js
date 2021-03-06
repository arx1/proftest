"use strict";

(function () {

    describe('Controller: MainController', () => {

        // load the controller's module
        beforeEach(module('proftestApp'));

        var scope;
        var MainController;
        var $httpBackend;

        // Initialize the controller and a mock scope
        beforeEach(inject((_$httpBackend_, $controller, $rootScope) => {
            $httpBackend = _$httpBackend_;
            $httpBackend.expectGET('/api/tests')
                .respond(['HTML5 Boilerplate', 'AngularJS', 'Karma', 'Express']);

            scope = $rootScope.$new();
            MainController = $controller('MainController', {
                $scope: scope
            });
        }));

        it('should attach a list of tests to the controller', () => {
            $httpBackend.flush();
            expect(MainController.awesomeTests.length).toBe(4);
        });
    });

})();
