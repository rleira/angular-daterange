'use strict';
angular.module('slonoed.daterange', [])
    .service('slDateProcessor', function() {
        this.isSame = function(f, s) {

            f = new Date(f._d || f);
            f.setSeconds(0);
            f.setMilliseconds(0);
            f.setMinutes(0);
            f.setHours(0);
            s = new Date(s._d || s);
            s.setSeconds(0);
            s.setMilliseconds(0);
            s.setMinutes(0);
            s.setHours(0);
            return f.getTime() === s.getTime();
        };

        this.isBefore = function(f, s) {
            f = new Date(f._d || f);
            f.setSeconds(0);
            f.setMilliseconds(0);
            f.setMinutes(0);
            f.setHours(0);
            s = new Date(s._d || s);
            s.setSeconds(0);
            s.setMilliseconds(0);
            s.setMinutes(0);
            s.setHours(0);
            return f.getTime() < s.getTime();
        };

        this.isAfter = function(f, s) {

            f = new Date(f._d || f);
            f.setSeconds(0);
            f.setMilliseconds(0);
            f.setMinutes(0);
            s = new Date(s._d || s);
            s.setSeconds(0);
            s.setMilliseconds(0);
            s.setMinutes(0);
            return f.getTime() > s.getTime();
        };

        this.one = 1;
    })
    .directive('slDaterange', ['$document', function($document) {
        return {
            restrict: 'E',
            replace: true,
            scope: {
                'startDateRaw': '=start',
                'endDateRaw': '=finish',
                'ngModel' : '=ngModel',
                'minDate' : '=minDate',
                'maxDate' : '=maxDate',
                'fixedStartDate' : '=fixedStartDate',
                'onApply' : '&',
                'ngDisabled': '='
            },
            transclude: true,
            templateUrl: 'daterange.html',
            link: function(scope, element, attrs) {
                scope.ngModel = false;

                scope.apply = function() {
                    scope.startDateRaw = scope.startDate.toDate();
                    scope.endDateRaw = scope.endDate.toDate();
                    scope.ngModel = false;
                    if(scope.onApply) {
                        //Use timeout in order to get access to start & end dates inside the apply function
                        setTimeout(function () {
                            scope.onApply.apply();
                        }, 0);
                    }
                };

                scope.clearRange = function() {
                    scope.startDate = moment(scope.startDateRaw).startOf('day');
                    scope.endDate = moment(scope.endDateRaw);

                    // if end date not start of day - get next day start timestamp
                    if (!scope.endDate.isSame(scope.endDate.startOf('day'))) {
                        scope.endDate = scope.endDate.add(1 ,'day').startOf('day');
                    }
                };

                scope.cancel = function() {
                    scope.clearRange();
                    scope.ngModel = false;
                };

                scope.toggle = function() {
                    if (!scope.ngDisabled) {
                        scope.ngModel = !scope.ngModel;
                        // update date after open
                        if (scope.ngModel) {
                            scope.clearRange();
                        }
                    }
                };

                scope.clearRange();

                scope.$watch('ngModel', function() {
                    scope.clearRange();
                    scope.$broadcast('calendarToggle', scope.ngModel ? true : false);
                });
            }
        };
    }])
    .directive('slCalendar', ['slDateProcessor', function(dateProcessor) {
        var locale = {
            applyLabel: 'Apply',
            clearLabel: 'Clear',
            fromLabel: 'From',
            toLabel: 'To',
            daysOfWeek: moment().localeData()._weekdaysMin,
            monthNames: moment().localeData()._monthsShort,
            firstDay: 0
        };

        var calendars = {};

        function buildCalendar(month, year) {
            var cacheKey = month + ' + ' + year;
            if (calendars[cacheKey]) {
                return calendars[cacheKey];
            }

            var firstDay = moment([year, month, 1]);
            var lastMonth = moment(firstDay).subtract(1, 'month').month();
            var lastYear = moment(firstDay).subtract(1, 'month').year();

            var daysInLastMonth = moment([lastYear, lastMonth]).daysInMonth();

            var dayOfWeek = firstDay.day();

            //initialize a 6 rows x 7 columns array for the calendar
            var calendar = [];
            for (var j = 0; j < 6; j++) {
                calendar[j] = [];
            }

            //populate the calendar with date objects
            var startDay = daysInLastMonth - dayOfWeek + locale.firstDay + 1;
            if (startDay > daysInLastMonth) {
                startDay -= 7;
            }

            if (dayOfWeek === locale.firstDay) {
                startDay = daysInLastMonth - 6;
            }

            var curDate = moment([lastYear, lastMonth, startDay]).startOf('day');
            for (var i = 0, col = 0, row = 0; i < 42; i++, col++, curDate = moment(curDate).add(1, 'day')) {
                if (i > 0 && col % 7 === 0) {
                    col = 0;
                    row++;
                }
                calendar[row][col] = curDate;
            }

            calendars[cacheKey] = calendar;
            return calendar;

        }


        var DATE_FORMAT = 'YYYY-MM-DD';

        return {
            restrict: 'E',
            replace: true,
            scope: {
                startDate: '=sdate',
                endDate: '=edate'
            },
            templateUrl: 'calendar.html',
            link: function(scope, element, attrs) {
                scope.left = attrs.left === '';

                scope.inRange = function(date) {
                    return (dateProcessor.isAfter(date, scope.startDate) && dateProcessor.isBefore(date, scope.endDate)) ||
                        dateProcessor.isSame(date, scope.startDate) || dateProcessor.isSame(date, scope.endDate);
                };

                scope.getDayNumber = function(day) {
                    return day.date();
                };

                scope.isOff = function(day) {
                    var anotherMonth = day.month() !== scope.current.month();
                    var beforeStartInRight = !scope.left && dateProcessor.isBefore(day, scope.startDate);
                    return anotherMonth || beforeStartInRight;
                };

                scope.updateCalendar = function() {
                    scope.calendar = buildCalendar(scope.current.month(), scope.current.year());
                    scope.monthName = locale.monthNames[scope.current.month()] + scope.current.format(' YYYY');
                };


                scope.isActive = function(day) {
                    // on left calendar check with startDate, on right - with endDate
                    if (scope.left) {
                        return dateProcessor.isSame(day, scope.startDate);
                    }
                    else {
                        return dateProcessor.isSame(day, scope.endDate);
                    }
                };

                scope.isDisabled = function(day) {
                    if(scope.left && scope.fixedStartDate) {
                        return true;
                    }
                    if(scope.$parent.minDate && moment(day).isBefore(moment(scope.$parent.minDate, DATE_FORMAT))) {
                        return true;
                    }
                    if(scope.$parent.maxDate && moment(day).isAfter(moment(scope.$parent.maxDate, DATE_FORMAT))) {
                        return true;
                    }
                    return false;
                };

                scope.locale = locale;
                scope.daysOfWeek = moment().localeData()._weekdaysMin;

                var forCurrent = scope.startDate || moment();
                scope.current = moment([forCurrent.year(), forCurrent.month(), 1]);

                scope.updateCalendar();

                scope.pickDate = function(date) {
                    if (scope.left && scope.$parent.fixedStartDate) {
                        return;
                    }
                    if (!scope.left && date.isBefore(scope.startDate)) {
                        return;
                    }
                    if(scope.$parent.minDate && date.isBefore(moment(scope.$parent.minDate, DATE_FORMAT))) {
                        return;
                    }
                    if(scope.$parent.maxDate && date.isAfter(moment(scope.$parent.maxDate, DATE_FORMAT))) {
                        return;
                    }

                    if (scope.left && dateProcessor.isAfter(date, scope.endDate)) {
                        scope.startDate = date;
                        scope.endDate = scope.startDate.clone().add(1, 'day');
                    }
                    scope[scope.left ? 'startDate' : 'endDate'] = date;
                };

                scope.setPrevMonth = function() {
                    scope.current.subtract(1, 'month');
                    scope.updateCalendar();
                };
                scope.setNextMonth = function() {
                    scope.current.add(1, 'month');
                    scope.updateCalendar();
                };

                scope.$on('calendarToggle', function(event, ngModel) {
                    if (ngModel) {
                        if (scope.left) {
                            scope.current = moment([moment(scope.$parent.startDateRaw).year(), moment(scope.$parent.startDateRaw).month(), 1]);
                            scope.calendar = buildCalendar(moment(scope.$parent.startDateRaw).month(), moment(scope.$parent.startDateRaw).year());
                        } else {
                            scope.current = moment([moment(scope.$parent.endDateRaw).year(), moment(scope.$parent.endDateRaw).month(), 1]);
                            scope.calendar = buildCalendar(moment(scope.$parent.endDateRaw).month(), moment(scope.$parent.endDateRaw).year());
                        }
                        scope.monthName = locale.monthNames[scope.current.month()] + scope.current.format(' YYYY');
                    }
                });
            }
        };
    }]);
