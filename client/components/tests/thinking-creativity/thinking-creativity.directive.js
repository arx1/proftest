"use strict";

(function () {
    angular.module('proftestApp.test')
        .directive('thinkingCreativity', () => {

            return {
                restrict: 'E',
                templateUrl: 'components/tests/thinking-creativity/thinking-creativity.html',
                scope: {
                    id: '@testId',
                    data: '=data',
                    index: '='
                },
                controllerAs: 'vm',
                bindToController: true,
                controller: controller
            };


        });

    controller.$inject = ['$scope', 'User', 'localStorageService'];
    function controller($scope, User, localStorageService) {
        let vm = this,
            testKey = vm.id,
            questionIndexKey = testKey + 'questionIndex',
            answers = JSON.parse(localStorageService.get(testKey)) || [];

        vm.index.currentQuestionIndex = +localStorageService.get(questionIndexKey) || 0;

        vm.getCurrentQuestion = () => vm.data.questions[vm.index.currentQuestionIndex];

        vm.nextQuestion = () => {
            vm.index.currentQuestionIndex++;
            localStorageService.set(questionIndexKey, vm.index.currentQuestionIndex);
            return vm.index.currentQuestionIndex;
        };

        vm.prevQuestion = () => {
            vm.index.currentQuestionIndex--;
            localStorageService.set(questionIndexKey, vm.index.currentQuestionIndex);
            return vm.index.currentQuestionIndex;
        };

        vm.answer = (value) => {
            answers[vm.index.currentQuestionIndex] = value;
            localStorageService.set(testKey, JSON.stringify(answers));

            vm.nextQuestion();

            if (!vm.getCurrentQuestion()) {
                User.putMyAnswers({}, {
                    testId: vm.id,
                    answers: answers
                }).$promise.then((resp) => {
                    localStorageService.remove(testKey, questionIndexKey);

					vm.result = true;
					vm.thinkingTypes = resp.result.map((item, index) => {
						item.type = vm.data.thinkingTypes[index];
						item.description = vm.data.description[index];
						item.level = vm.data.levels[item.level];
						return item;
					});
					vm.creativity = vm.thinkingTypes.pop();
					vm.thinkingTypes.sort((a, b) => a.score < b.score);
                })
            }
        };
    }
})();

