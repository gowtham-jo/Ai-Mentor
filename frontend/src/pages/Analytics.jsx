import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  BookOpen,
  TrendingUp,
  Award,
  ChevronLeft,
  ChevronRight,
  Plus,
  CheckCircle,
  Clock,
  AlertCircle,
  Target,
  Zap,
  BarChart3,
} from "lucide-react";
import Header from "../components/Header";
import Sidebar from "../components/Sidebar";
import { useAuth } from "../context/AuthContext";
import { useSidebar } from "../context/SidebarContext";
import { useTranslation } from "react-i18next";

const Analytics = () => {
  const { t } = useTranslation();
  const { sidebarOpen, setSidebarOpen, sidebarCollapsed, setSidebarCollapsed } = useSidebar();
  const { user } = useAuth();

  const [courses, setCourses] = useState([]);
  const [studySessions, setStudySessions] = useState([]);

  const [analyticsData, setAnalyticsData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(null);
  const [tasks, setTasks] = useState({});
  const [newTask, setNewTask] = useState("");
  const [streak, setStreak] = useState(0);
  const [activeTab, setActiveTab] = useState("courses");

  const statusEmojis = {
    Completed: "✅",
    Ongoing: "🔄",
    Upcoming: "📅",
  };
  const statusIcons = {
    Completed: <CheckCircle className="w-4 h-4 text-green-500" />,
    Ongoing: <Clock className="w-4 h-4 text-yellow-500" />,
    Upcoming: <AlertCircle className="w-4 h-4 text-gray-400" />,
  };

  const formatDateKey = (date) =>
    `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;

  // Fetch courses and analytics
  useEffect(() => {
    const fetchData = async () => {
      try {
        const token = localStorage.getItem("token");
        if (!token) {
          console.error("No authentication token found in localStorage; skipping analytics fetch.");
          setCourses([]);
          setStudySessions([]);
          return;
        }

        const headers = { Authorization: `Bearer ${token}` };

        const coursesRes = await fetch("/api/courses", { headers });
        const analyticsRes = await fetch("/api/analytics", { headers });

        if (!coursesRes.ok) {
          console.error("Failed to fetch courses:", coursesRes.status, coursesRes.statusText);
          setCourses([]);
        } else {
          const coursesData = await coursesRes.json();
          setCourses(coursesData);
        }

        if (!analyticsRes.ok) {
          console.error("Failed to fetch analytics:", analyticsRes.status, analyticsRes.statusText);
          setStudySessions([]);
        } else {
          let analyticsData;
          try {
            analyticsData = await analyticsRes.json();
          } catch (parseError) {
            console.error("Failed to parse analytics response as JSON:", parseError);
            setStudySessions([]);
            return;
          }
          setStudySessions(analyticsData.studySessions || []);
        }
      } catch (err) {
        console.error("Unexpected error while fetching analytics data:", err);
        setCourses([]);
        setStudySessions([]);
      }
    };

    if (user) fetchData();
  }, [user]);

  // Streak calculation
  useEffect(() => {
    const todayStr = new Date().toDateString();
    const lastLoginStr = localStorage.getItem("lastLogin");
    let currentStreak = parseInt(localStorage.getItem("streak")) || 0;

    if (lastLoginStr !== todayStr) {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      if (lastLoginStr === yesterday.toDateString()) currentStreak += 1;
      else currentStreak = 1;

      localStorage.setItem("streak", currentStreak);
      localStorage.setItem("lastLogin", todayStr);
      setStreak(currentStreak);
    } else setStreak(currentStreak);
  }, []);

  // Load tasks
  useEffect(() => {
    const saved = localStorage.getItem("calendarTasks");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        // Ensure we only set an object; otherwise fall back to empty object
        setTasks(parsed && typeof parsed === "object" ? parsed : {});
      } catch (error) {
        // If the stored data is corrupted, remove it and fall back to an empty object
        console.error("Failed to parse calendarTasks from localStorage:", error);
        localStorage.removeItem("calendarTasks");
        setTasks({});
      }
    }
    setSelectedDate(formatDateKey(new Date()));
  }, []);

  useEffect(() => {
    localStorage.setItem("calendarTasks", JSON.stringify(tasks));
  }, [tasks]);

  // Dark mode effect
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  const totalCourses = user?.purchasedCourses?.length || 0;

  const certificates =
    user?.purchasedCourses?.filter((course) => {
      const courseInfo = courses.find((c) => c.id == course.courseId);
      const totalLessons = courseInfo?.lessonsCount || 0;
      const completedLessons = course.progress?.completedLessons?.length || 0;
      return totalLessons > 0 && completedLessons === totalLessons;
    }).length || 0;

  const calculateAttendance = () => {
    const today = new Date();
    const last30 = [];
    for (let i = 0; i < 30; i++) {
      const d = new Date();
      d.setDate(today.getDate() - i);
      last30.push(d.toDateString());
    }
    const studiedDays = studySessions.map((s) =>
      new Date(s.date).toDateString(),
    );
    const uniqueDays = [...new Set(studiedDays)];
    const attended = uniqueDays.filter((d) => last30.includes(d)).length;
    return Math.round((attended / 30) * 100);
  };

  const attendance = calculateAttendance();

  const addTask = () => {
    if (!newTask.trim()) return;
    const dateKey = selectedDate || formatDateKey(new Date());
    setTasks((prev) => ({
      ...prev,
      [dateKey]: [
        ...(prev[dateKey] || []),
        { text: newTask.trim(), status: "Upcoming" },
      ],
    }));
    setNewTask("");
  };

  const updateTaskStatus = (index, status) => {
    if (!tasks[selectedDate]) return;
    setTasks((prev) => {
      const updated = [...prev[selectedDate]];
      updated[index].status = status;
      return { ...prev, [selectedDate]: updated };
    });
  };

  const deleteTask = (index) => {
    setTasks((prev) => {
      if (!prev[selectedDate]) return prev;
      const updated = [...prev[selectedDate]];
      updated.splice(index, 1);
      return { ...prev, [selectedDate]: updated };
    });
  };

  const generateCalendarGrid = (date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const grid = [];
    let day = 1;
    for (let i = 0; i < 6; i++) {
      const week = [];
      for (let j = 0; j < 7; j++) {
        if (i === 0 && j < firstDay) week.push(null);
        else if (day > daysInMonth) week.push(null);
        else {
          week.push(day);
          day++;
        }
      }
      grid.push(week);
    }
    return grid;
  };

  const calendarGrid = generateCalendarGrid(currentDate);

  const handlePrevMonth = () => {
    setCurrentDate((prev) => {
      const d = new Date(prev);
      d.setMonth(d.getMonth() - 1);
      return d;
    });
  };

  const handleNextMonth = () => {
    setCurrentDate((prev) => {
      const d = new Date(prev);
      d.setMonth(d.getMonth() + 1);
      return d;
    });
  };

  const getDateKey = (day) =>
    formatDateKey(
      new Date(currentDate.getFullYear(), currentDate.getMonth(), day),
    );

  const myCourses =
    user?.purchasedCourses?.map((c) => {
      const courseInfo = courses.find((course) => course.id == c.courseId);
      const completedLessons = c.progress?.completedLessons?.length || 0;
      const totalLessons = courseInfo?.lessonsCount || 0;
      const rawProgress = totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0;
      const progress = Math.max(0, Math.min(100, rawProgress));
      const remaining = Math.max(0, totalLessons - completedLessons);
      return {
        id: c.courseId,
        title: courseInfo?.title || "Course",
        level: courseInfo?.level || "Beginner",
        image: courseInfo?.image || "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?ixlib=rb-4.0.3&auto=format&fit=crop&w=150&q=80",
        category: courseInfo?.category || "Education",
        completedLessons,
        totalLessons,
        progress,
        remaining,
      };
    }) || [];

  // Filter courses based on search
  const filteredCourses = myCourses.filter(course =>
    course.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    course.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Calculate total study time
  const totalStudyTime = studySessions.reduce((acc, session) => acc + (session.duration || 0), 0);
  const averageProgress = myCourses.length > 0 
    ? Math.round(myCourses.reduce((acc, c) => acc + c.progress, 0) / myCourses.length) 
    : 0;
    if (user) {
      fetchAllData()
    }
  }, [user])

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <Header sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />
        <Sidebar
          sidebarOpen={sidebarOpen}
          setSidebarOpen={setSidebarOpen}
          sidebarCollapsed={sidebarCollapsed}
          setSidebarCollapsed={setSidebarCollapsed}
          activePage="analytics"
        />
        <div className={`flex-1 flex flex-col overflow-hidden transition-all duration-300 ${sidebarCollapsed ? 'lg:ml-20' : 'lg:ml-80'
          }`}>
          <main className="flex-1 mt-16 overflow-x-hidden overflow-y-auto bg-gray-50 p-8">
            <div className="max-w-7xl mx-auto space-y-8">
              <div className="flex justify-center items-center h-64">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#FA946D] mx-auto"></div>
                  <p className="mt-4 text-gray-600">{t("analytics.loading")}</p>
                </div>
              </div>
            </div>
          </main>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-canvas-alt flex flex-col">
        <Header sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />
        <Sidebar
          sidebarOpen={sidebarOpen}
          setSidebarOpen={setSidebarOpen}
          sidebarCollapsed={sidebarCollapsed}
          setSidebarCollapsed={setSidebarCollapsed}
          activePage="analytics"
        />
        <div className={`flex-1 flex flex-col overflow-hidden transition-all duration-300 ${sidebarCollapsed ? 'lg:ml-20' : 'lg:ml-80'
          }`}>
          <main className="flex-1 mt-16 overflow-x-hidden overflow-y-auto bg-canvas-alt p-8">
            <div className="max-w-7xl mx-auto space-y-8">
              <div className="flex justify-center items-center h-64">
                <div className="text-center">
                  <div className="text-red-500 text-lg">{t("analytics.error")}</div>
                  <p className="mt-2 text-muted">{error}</p>
                </div>
              </div>
            </div>
          </main>
        </div>
      </div>
    );
  }

  const studyDaysInCurrentMonth = analyticsData?.studySessions
    .map(s => new Date(s.date))
    .filter(d => d.getFullYear() === currentDate.getFullYear() && d.getMonth() === currentDate.getMonth())
    .map(d => d.getDate()) || [];

  const calendarGrid = generateCalendarGrid(currentDate, studyDaysInCurrentMonth);

  const learningHoursChartData = analyticsData?.learningHoursChart || [];
  const maxLearningHour = Math.max(...learningHoursChartData.map(d => d.hours), 1); // Avoid division by zero

  const coursePerformanceData = user?.purchasedCourses?.map(purchasedCourse => {
    const courseInfo = allCourses.find(c => c.id == purchasedCourse.courseId);
    const totalLessons = courseInfo?.lessonsCount ||
      (courseInfo?.lessons ? (courseInfo.lessons.includes(" of ") ? parseInt(courseInfo.lessons.split(" of ")[1]) : parseInt(courseInfo.lessons.split(" ")[0])) : 0);
    const completedLessons = purchasedCourse.progress?.completedLessons?.length || 0;
    const progressPercent = totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0;

    return {
      ...purchasedCourse,
      totalLessons,
      completedLessons,
      progressPercent
    };
  }) || [];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 flex flex-col">
      <Header/>

      <Sidebar activePage="analytics" />

      <div
        className={`flex-1 transition-all duration-300 mt-16 ${
          sidebarCollapsed ? "lg:ml-20" : "lg:ml-80"
        }`}
      >
        <main className="p-4 md:p-6 lg:p-8">
          {/* Welcome Section */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-main">
              Welcome back, {user?.name || 'Learner'}!
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-2 text-lg">
              Here's your learning progress and upcoming tasks
            </p>
          </div>
      {/* Main Content */}
      <div className={`flex-1 flex flex-col overflow-hidden transition-all duration-300 ${sidebarCollapsed ? 'lg:ml-20' : 'lg:ml-80'
        }`}>
        <main className="flex-1 mt-16 overflow-x-hidden overflow-y-auto bg-canvas-alt p-8">
          <div className="max-w-7xl mx-auto space-y-8">
            {/* Metrics Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
              {/* Attendance Card */}
              <div className="bg-card rounded-xl border border-border p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-muted text-sm mb-1">{t("analytics.attendance")}</div>
                    <div className="text-green-600 dark:text-green-400 text-2xl font-bold">{analyticsData?.attendance || 0}%</div>
                  </div>
                  <div className="w-12 h-12 bg-green-100 dark:bg-green-900/20 rounded-lg flex items-center justify-center">
                    <svg className="w-[14px] h-4" viewBox="0 0 14 16" fill="none">
                      <path d="M4 0C4.55312 0 5 0.446875 5 1V2H9V1C9 0.446875 9.44687 0 10 0C10.5531 0 11 0.446875 11 1V2H12.5C13.3281 2 14 2.67188 14 3.5V5H0V3.5C0 2.67188 0.671875 2 1.5 2H3V1C3 0.446875 3.44688 0 4 0ZM0 6H14V14.5C14 15.3281 13.3281 16 12.5 16H1.5C0.671875 16 0 15.3281 0 14.5V6ZM10.2812 9.53125C10.575 9.2375 10.575 8.7625 10.2812 8.47188C9.9875 8.18125 9.5125 8.17813 9.22188 8.47188L6.25313 11.4406L4.78438 9.97188C4.49063 9.67813 4.01562 9.67813 3.725 9.97188C3.43437 10.2656 3.43125 10.7406 3.725 11.0312L5.725 13.0312C6.01875 13.325 6.49375 13.325 6.78438 13.0312L10.2812 9.53125Z" fill="#16A34A" />
                    </svg>
                  </div>
                </div>
              </div>

          {/* METRICS CARDS */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {[
              {
                label: "Enrolled Courses",
                value: totalCourses,
                icon: <BookOpen className="w-6 h-6 text-indigo-600" />,
                color: "from-indigo-500 to-indigo-600",
                bgColor: "bg-indigo-50 dark:bg-indigo-900/20",
                trend: totalCourses > 0 ? `${myCourses.filter(c => c.progress > 0).length} in progress` : 'Start learning!'
              },
              {
                label: "Attendance Rate",
                value: `${attendance}%`,
                icon: <BarChart3 className="w-6 h-6 text-green-600" />,
                color: "from-green-500 to-green-600",
                bgColor: "bg-green-50 dark:bg-green-900/20",
                trend: attendance > 70 ? '👍 Great consistency' : '👀 Needs improvement'
              },
              {
                label: "Current Streak",
                value: `${streak} ${streak > 0 ? '🔥' : '📅'}`,
                icon: <Zap className="w-6 h-6 text-yellow-600" />,
                color: "from-yellow-500 to-yellow-600",
                bgColor: "bg-yellow-50 dark:bg-yellow-900/20",
                trend: streak > 0 ? `${streak} day${streak > 1 ? 's' : ''} streak!` : 'Start your streak today!'
              },
              {
                label: "Certificates",
                value: certificates,
                icon: <Award className="w-6 h-6 text-purple-600" />,
                color: "from-purple-500 to-purple-600",
                bgColor: "bg-purple-50 dark:bg-purple-900/20",
                trend: certificates > 0 ? '🎉 Achievements unlocked' : 'Complete courses to earn'
              },
            ].map((metric, idx) => (
              <div
                key={idx}
                className="group relative bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">{metric.label}</p>
                    <p className={`text-3xl font-bold bg-gradient-to-r ${metric.color} bg-clip-text text-transparent`}>
                      {metric.value}
                    </p>
                    <div className="text-muted text-sm mb-1">{t("analytics.avg_marks")}</div>
                    <div className="text-blue-600 dark:text-blue-400 text-2xl font-bold">{analyticsData?.avgMarks || 0}</div>
                  </div>
                  <div className={`${metric.bgColor} p-3 rounded-xl group-hover:scale-110 transition-transform`}>
                    {metric.icon}
                  </div>
                </div>
                <div className="mt-4 flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
                  <TrendingUp className="w-3 h-3" />
                  <span>{metric.trend}</span>
              </div>

              {/* Daily Hours Card */}
              <div className="bg-card rounded-xl border border-border p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-muted text-sm mb-1">{t("analytics.daily_hours")}</div>
                    <div className="text-purple-600 dark:text-purple-400 text-2xl font-bold">{analyticsData?.dailyHours || 0}h</div>
                  </div>
                  <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/20 rounded-lg flex items-center justify-center">
                    <svg className="w-4 h-4" viewBox="0 0 16 16" fill="none">
                      <path d="M8 0C10.1217 0 12.1566 0.842855 13.6569 2.34315C15.1571 3.84344 16 5.87827 16 8C16 10.1217 15.1571 12.1566 13.6569 13.6569C12.1566 15.1571 10.1217 16 8 16C5.87827 16 3.84344 15.1571 2.34315 13.6569C0.842855 12.1566 0 10.1217 0 8C0 5.87827 0.842855 3.84344 2.34315 2.34315C3.84344 0.842855 5.87827 0 8 0ZM7.25 3.75V8C7.25 8.25 7.375 8.48438 7.58437 8.625L10.5844 10.625C10.9281 10.8562 11.3938 10.7625 11.625 10.4156C11.8562 10.0687 11.7625 9.60625 11.4156 9.375L8.75 7.6V3.75C8.75 3.33437 8.41562 3 8 3C7.58437 3 7.25 3.33437 7.25 3.75Z" fill="#9333EA" />
                    </svg>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Quick Stats Row */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm">
              <div className="text-sm text-gray-500">Average Progress</div>
              <div className="text-xl font-bold text-indigo-600">{averageProgress}%</div>
              <div className="w-full bg-gray-200 rounded-full h-1.5 mt-2">
                <div 
                  className="bg-gradient-to-r from-indigo-500 to-purple-500 h-1.5 rounded-full transition-all duration-500" 
                  style={{ width: `${averageProgress}%` }}
                ></div>
              </div>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm">
              <div className="text-sm text-gray-500">Completed Lessons</div>
              <div className="text-xl font-bold text-green-600">
                {myCourses.reduce((acc, c) => acc + c.completedLessons, 0)}
              </div>
              <div className="text-xs text-gray-400 mt-2">Across all courses</div>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm">
              <div className="text-sm text-gray-500">Total Study Time</div>
              <div className="text-xl font-bold text-purple-600">
                {Math.round(totalStudyTime / 60)} hrs
              </div>
              <div className="text-xs text-gray-400 mt-2">All time</div>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm">
              <div className="text-sm text-gray-500">Upcoming Tasks</div>
              <div className="text-xl font-bold text-yellow-600">
                {Object.values(tasks).flat().filter(t => t.status === "Upcoming").length}
              {/* Courses Card */}
              <div className="bg-card rounded-xl border border-border p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-muted text-sm mb-1">{t("analytics.courses")}</div>
                    <div className="text-orange-600 dark:text-orange-400 text-2xl font-bold">{analyticsData?.totalCourses || 0}</div>
                  </div>
                  <div className="w-12 h-12 bg-orange-100 dark:bg-orange-900/20 rounded-lg flex items-center justify-center">
                    <svg className="w-[14px] h-4" viewBox="0 0 14 16" fill="none">
                      <path d="M3 0C1.34375 0 0 1.34375 0 3V13C0 14.6562 1.34375 16 3 16H12H13C13.5531 16 14 15.5531 14 15C14 14.4469 13.5531 14 13 14V12C13.5531 12 14 11.5531 14 11V1C14 0.446875 13.5531 0 13 0H12H3ZM3 12H11V14H3C2.44688 14 2 13.5531 2 13C2 12.4469 2.44688 12 3 12ZM4 4.5C4 4.225 4.225 4 4.5 4H10.5C10.775 4 11 4.225 11 4.5C11 4.775 10.775 5 10.5 5H4.5C4.225 5 4 4.775 4 4.5ZM4.5 6H10.5C10.775 6 11 6.225 11 6.5C11 6.775 10.775 7 10.5 7H4.5C4.225 7 4 6.775 4 6.5C4 6.225 4.225 6 4.5 6Z" fill="#EA580C" />
                    </svg>
                  </div>
                </div>
              </div>
              <div className="text-xs text-gray-400 mt-2">Need attention</div>
            </div>
          </div>

          {/* Tab Navigation */}
          <div className="flex gap-2 mb-6 border-b dark:border-gray-700">
            <button
              onClick={() => setActiveTab("courses")}
              className={`px-4 py-2 font-medium transition-colors relative ${
                activeTab === "courses"
                  ? "text-indigo-600 dark:text-indigo-400"
                  : "text-gray-500 hover:text-gray-700 dark:text-gray-400"
              }`}
            >
              My Courses
              {activeTab === "courses" && (
                <span className="absolute bottom-0 left-0 w-full h-0.5 bg-indigo-600"></span>
              )}
            </button>
            <button
              onClick={() => setActiveTab("calendar")}
              className={`px-4 py-2 font-medium transition-colors relative ${
                activeTab === "calendar"
                  ? "text-indigo-600 dark:text-indigo-400"
                  : "text-gray-500 hover:text-gray-700 dark:text-gray-400"
              }`}
            >
              Calendar & Tasks
              {activeTab === "calendar" && (
                <span className="absolute bottom-0 left-0 w-full h-0.5 bg-indigo-600"></span>
              )}
            </button>
          </div>

          {activeTab === "courses" && (
            <div className="mb-8">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-200 flex items-center gap-2">
                  <BookOpen className="w-6 h-6 text-indigo-600" />
                  My Courses
                  <span className="text-sm font-normal text-gray-500 bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded-full">
                    {filteredCourses.length}
                  </span>
                </h2>
                <Link
                  to="/courses"
                  className="text-indigo-600 hover:text-indigo-700 text-sm font-medium flex items-center gap-1"
                >
                  Browse All Courses
                  <ChevronRight className="w-4 h-4" />
                </Link>
              </div>
              
              <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg overflow-hidden border border-gray-100 dark:border-gray-700">
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead className="bg-gray-50 dark:bg-gray-700/50">
                      <tr>
                        <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Course</th>
                        <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Progress</th>
                        <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Stats</th>
                        <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Level</th>
                        <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                      {filteredCourses.length > 0 ? (
                        filteredCourses.map((course) => (
                          <tr 
                            key={course.id} 
                            className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors group"
                          >
                            <td className="px-6 py-4">
                              <Link to={`/learning/${course.id}`} className="flex items-center gap-4">
                                <div className="relative">
                                  <img 
                                    src={course.image} 
                                    alt={course.title} 
                                    className="w-12 h-12 rounded-xl object-cover group-hover:scale-105 transition-transform duration-300" 
                                  />
                                  <div className="absolute inset-0 rounded-xl bg-indigo-600 opacity-0 group-hover:opacity-10 transition-opacity"></div>
                                </div>
                                <div>
                                  <div className="font-semibold text-gray-800 dark:text-gray-200 line-clamp-1">
                                    {course.title}
                                  </div>
                                  <div className="flex items-center gap-2 mt-1">
                                    <span className="text-xs px-2 py-0.5 bg-gray-100 dark:bg-gray-700 rounded-full text-gray-600 dark:text-gray-300">
                                      {course.category}
                                    </span>
                                    <span className="text-xs text-gray-400">
                                      {course.remaining} lessons left
                                    </span>
                                  </div>
                                </div>
                              </Link>
                            </td>
                            <td className="px-6 py-4">
                              <div className="w-40">
                                <div className="flex justify-between mb-1">
                                  <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
                                    {course.progress}%
                                  </span>
                                </div>
                                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 overflow-hidden">
                                  <div 
                                    className="bg-gradient-to-r from-indigo-500 to-purple-500 h-2 rounded-full transition-all duration-500 relative"
                                    style={{ width: `${course.progress}%` }}
                                  >
                                    <div className="absolute inset-0 bg-white/20 animate-shimmer"></div>
                                  </div>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-1">
                                <CheckCircle className="w-4 h-4 text-green-500" />
                                <span className="text-sm text-gray-600 dark:text-gray-400">
                                  <span className="font-semibold text-indigo-600">{course.completedLessons}</span>
                                  <span className="mx-1 text-gray-300">/</span>
                                  <span>{course.totalLessons}</span>
                                </span>
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <span className={`px-3 py-1 text-xs rounded-full font-medium ${
                                course.level === 'Beginner' 
                                  ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' 
                                  : course.level === 'Intermediate' 
                                  ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' 
                                  : 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400'
                              }`}>
                                {course.level}
                              </span>
                            </td>
                            <td className="px-6 py-4">
                              <Link
                                to={`/learning/${course.id}`}
                                className="inline-flex items-center gap-1 text-indigo-600 hover:text-indigo-700 text-sm font-medium"
                              >
                                Continue
                                <ChevronRight className="w-4 h-4" />
                              </Link>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan="5" className="px-6 py-16 text-center">
                            <div className="flex flex-col items-center gap-3">
                              <BookOpen className="w-12 h-12 text-gray-300" />
                              <p className="text-gray-500">
                                {searchQuery ? 'No courses match your search' : 'No courses enrolled yet.'}
                              </p>
                              {!searchQuery && (
                                <Link 
                                  to="/courses" 
                                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition"
                                >
                                  Browse Courses
                                </Link>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {activeTab === "calendar" && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* CALENDAR */}
              <div className="lg:col-span-2 bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg">
                {/* Month Navigation */}
                <div className="flex justify-between items-center mb-6">
                  <button
                    onClick={handlePrevMonth}
                    className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition group"
                  >
                    <ChevronLeft className="w-5 h-5 text-gray-600 dark:text-gray-400 group-hover:text-indigo-600" />
                  </button>
                  <span className="text-xl font-bold text-gray-800 dark:text-gray-200">
                    {currentDate.toLocaleString("default", {
                      month: "long",
                      year: "numeric",
                    })}
                  </span>
                  <button
                    onClick={handleNextMonth}
                    className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition group"
                  >
                    <ChevronRight className="w-5 h-5 text-gray-600 dark:text-gray-400 group-hover:text-indigo-600" />
                  </button>
              {/* Certificates Card */}
              <div className="bg-card rounded-xl border border-border p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-muted text-sm mb-1">{t("analytics.certificates")}</div>
                    <div className="text-yellow-600 dark:text-yellow-400 text-2xl font-bold">{analyticsData?.certificates || 0}</div>
                  </div>
                  <div className="w-12 h-12 bg-yellow-100 dark:bg-yellow-900/20 rounded-lg flex items-center justify-center">
                    <svg className="w-3 h-4" viewBox="0 0 12 16" fill="none">
                      <path d="M6 0L8.5 2.5L11.5 1.5L10.5 4.5L13 7L10.5 9.5L11.5 12.5L8.5 11.5L6 14L3.5 11.5L0.5 12.5L1.5 9.5L-1 7L1.5 4.5L0.5 1.5L3.5 2.5L6 0Z" fill="#CA8A04" />
                    </svg>
                  </div>
                </div>
              </div>
            </div>
          </div>
          {/* Two Column Layout */}
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
            {/* Left Column - Calendar */}
            <div className="xl:col-span-2">
              <div className="bg-card rounded-xl border border-border p-6">
                {/* Calendar Header */}
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xl font-semibold text-main">{t("analytics.class_calendar")}</h3>
                  <div className="flex items-center space-x-2">
                    <button onClick={handlePrevMonth} className="w-[26px] h-10 bg-canvas dark:bg-zinc-800 rounded-lg flex items-center justify-center">
                      <svg className="w-[10px] h-4" viewBox="0 0 11 16" fill="none">
                        <path d="M1.21582 7.29365C0.825195 7.68428 0.825195 8.31865 1.21582 8.70928L7.21582 14.7093C7.60645 15.0999 8.24082 15.0999 8.63145 14.7093C9.02207 14.3187 9.02207 13.6843 8.63145 13.2937L3.3377 7.9999L8.62832 2.70615C9.01895 2.31553 9.01895 1.68115 8.62832 1.29053C8.2377 0.899902 7.60332 0.899902 7.2127 1.29053L1.2127 7.29053L1.21582 7.29365Z" fill="#4B5563" />
                      </svg>
                    </button>
                    <span className="text-lg text-main font-medium px-2">{currentDate.toLocaleString('default', { month: 'long', year: 'numeric' })}</span>
                    <button onClick={handleNextMonth} className="w-[26px] h-10 bg-canvas dark:bg-zinc-800 rounded-lg flex items-center justify-center">
                      <svg className="w-[10px] h-4" viewBox="0 0 10 16" fill="none">
                        <path d="M9.70615 7.29365C10.0968 7.68428 10.0968 8.31865 9.70615 8.70928L3.70615 14.7093C3.31553 15.0999 2.68115 15.0999 2.29053 14.7093C1.8999 14.3187 1.8999 13.6843 2.29053 13.2937L7.58428 7.9999L2.29365 2.70615C1.90303 2.31553 1.90303 1.68115 2.29365 1.29053C2.68428 0.899902 3.31865 0.899902 3.70928 1.29053L9.70928 7.29053L9.70615 7.29365Z" fill="#4B5563" />
                      </svg>
                    </button>
                  </div>
                </div>

                {/* Weekdays */}
                <div className="grid grid-cols-7 gap-2 mb-2">
                  {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
                    <div key={d} className="text-center text-sm font-medium text-gray-500 dark:text-gray-400">
                      {d}
                    </div>
                  ))}
                </div>

                {/* Calendar Grid */}
                <div className="grid grid-cols-7 gap-2">
                  {calendarGrid.flat().map((day, index) => {
                    if (!day) return <div key={index} className="h-24 bg-gray-50 dark:bg-gray-800/50 rounded-xl" />;
                    const key = getDateKey(day);
                    const isToday = key === formatDateKey(new Date());
                    const taskList = tasks[key] || [];
                    const displayTasks = taskList.slice(0, 2);
                    const remainingCount = Math.max(taskList.length - displayTasks.length, 0);
                    const completedCount = taskList.filter(t => t.status === "Completed").length;
                    const progress = taskList.length > 0 ? (completedCount / taskList.length) * 100 : 0;

                    return (
                      <div
                        key={index}
                        onClick={() => setSelectedDate(key)}
                        className={`relative h-24 rounded-xl p-2 cursor-pointer transition-all duration-300
                          ${selectedDate === key 
                            ? 'ring-2 ring-indigo-500 shadow-lg scale-105 z-10' 
                            : 'hover:ring-1 hover:ring-gray-300 dark:hover:ring-gray-600'
                          }
                          ${isToday 
                            ? 'bg-gradient-to-br from-yellow-50 to-orange-50 dark:from-yellow-900/30 dark:to-orange-900/30 border-2 border-yellow-400' 
                            : taskList.length > 0 && completedCount === taskList.length
                            ? 'bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/30 dark:to-emerald-900/30'
                            : 'bg-white dark:bg-gray-800'
                          }`}
                      >
                        <div className="flex justify-between items-start">
                          <span className={`text-sm font-semibold ${
                            isToday ? 'text-orange-600 dark:text-orange-400' : 'text-gray-700 dark:text-gray-300'
                          }`}>
                            {day}
                          </span>
                          {taskList.length > 0 && (
                            <span className="text-xs bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 px-1.5 rounded-full">
                              {taskList.length}
                            </span>
                          )}
                        </div>
                        
                        {taskList.length > 0 && (
                          <>
                            <div className="mt-1 space-y-0.5">
                              {displayTasks.map((task, idx) => (
                                <div key={idx} className="flex items-center gap-1 text-[10px]">
                                  <span>{statusEmojis[task.status]}</span>
                                  <span className="truncate text-gray-600 dark:text-gray-400">{task.text}</span>
                                </div>
                              ))}
                              {remainingCount > 0 && (
                                <div className="text-[9px] text-gray-500 dark:text-gray-500">
                                  +{remainingCount} more
                                </div>
                              )}
                            </div>
                            
                            {/* Progress indicator */}
                            {taskList.length > 1 && (
                              <div className="absolute bottom-1 left-2 right-2 h-0.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                                <div 
                                  className="h-full bg-green-500 rounded-full transition-all duration-300"
                                  style={{ width: `${progress}%` }}
                                ></div>
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Legend */}
                <div className="flex flex-wrap items-center gap-4 mt-6 pt-4 border-t dark:border-gray-700">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-gradient-to-br from-yellow-50 to-orange-50 border-2 border-yellow-400"></div>
                    <span className="text-xs text-gray-600 dark:text-gray-400">Today</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-gradient-to-br from-green-50 to-emerald-50"></div>
                    <span className="text-xs text-gray-600 dark:text-gray-400">All Completed</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span>✅</span>
                    <span className="text-xs text-gray-600 dark:text-gray-400">Completed</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span>🔄</span>
                    <span className="text-xs text-gray-600 dark:text-gray-400">Ongoing</span>
                {/* Calendar Legend */}
                <div className="flex items-center space-x-4 mt-6 text-sm">
                  <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                    <span className="text-muted">{t("analytics.upcoming")}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                    <span className="text-muted">{t("analytics.completed")}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                    <span className="text-muted">{t("analytics.missed")}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column - AI Insights & Schedule */}
            <div className="space-y-6">
              {/* AI Insights */}
              <div className="bg-linear-to-r from-[#FFF4F0] to-[#E7FFFC] border border-[#FFDACC] rounded-xl p-6 shadow-[0_0_20px_rgba(102,126,234,0.3)]">
                <div className="flex items-center space-x-3 mb-4">
                  <div className="w-10 h-10 bg-[#FE6C34] rounded-lg flex items-center justify-center">
                    <svg className="w-5 h-4" viewBox="0 0 20 16" fill="none">
                      <path d="M10 0C10.5531 0 11 0.446875 11 1V3H14.75C15.9937 3 17 4.00625 17 5.25V13.75C17 14.9937 15.9937 16 14.75 16H5.25C4.00625 16 3 14.9937 3 13.75V5.25C3 4.00625 4.00625 3 5.25 3H9V1C9 0.446875 9.44687 0 10 0ZM6.5 12C6.225 12 6 12.225 6 12.5C6 12.775 6.225 13 6.5 13H7.5C7.775 13 8 12.775 8 12.5C8 12.225 7.775 12 7.5 12H6.5ZM9.5 12C9.225 12 9 12.225 9 12.5C9 12.775 9.225 13 9.5 13H10.5C10.775 13 11 12.775 11 12.5C11 12.225 10.775 12 10.5 12H9.5ZM12.5 12C12.225 12 12 12.225 12 12.5C12 12.775 12.225 13 12.5 13H13.5C13.775 13 14 12.775 14 12.5C14 12.225 13.775 12 13.5 12H12.5ZM8.25 8C8.25 7.66848 8.1183 7.35054 7.88388 7.11612C7.64946 6.8817 7.33152 6.75 7 6.75C6.66848 6.75 6.35054 6.8817 6.11612 7.11612C5.8817 7.35054 5.75 7.66848 5.75 8C5.75 8.33152 5.8817 8.64946 6.11612 8.88388C6.35054 9.1183 6.66848 9.25 7 9.25C7.33152 9.25 7.64946 9.1183 7.88388 8.88388C8.1183 8.64946 8.25 8.33152 8.25 8ZM13 9.25C13.3315 9.25 13.6495 9.1183 13.8839 8.88388C14.1183 8.64946 14.25 8.33152 14.25 8C14.25 7.66848 14.1183 7.35054 13.8839 7.11612C13.6495 6.8817 13.3315 6.75 13 6.75C12.6685 6.75 12.3505 6.8817 12.1161 7.11612C11.8817 7.35054 11.75 7.66848 11.75 8C11.75 8.33152 11.8817 8.64946 12.1161 8.88388C12.3505 9.1183 12.6685 9.25 13 9.25ZM1.5 7H2V13H1.5C0.671875 13 0 12.3281 0 11.5V8.5C0 7.67188 0.671875 7 1.5 7ZM18.5 7C19.3281 7 20 7.67188 20 8.5V11.5C20 12.3281 19.3281 13 18.5 13H18V7H18.5Z" fill="white" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-semibold text-black">{t("analytics.ai_insights")}</h3>
                </div>
                <div className="space-y-3 text-sm text-gray-700">
                  <p>Your performance in Machine Learning has improved by 15% this week!</p>
                  <p>Consider reviewing Data Structures - your quiz scores suggest more practice needed.</p>
                  <p>Great consistency! You've maintained 4+ hours daily for 2 weeks.</p>
                </div>
              </div>

              {/* Today's Schedule */}
              <div className="bg-card rounded-xl border border-border p-6">
                <h3 className="text-lg font-semibold text-main mb-4">{t("analytics.schedule")}</h3>
                <div className="space-y-3">
                  <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3 flex items-center space-x-3">
                    <div className="w-2 h-8 bg-blue-500 rounded-full"></div>
                    <div>
                      <div className="font-medium text-main">Machine Learning</div>
                      <div className="text-sm text-muted">10:00 AM - 11:30 AM</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span>📅</span>
                    <span className="text-xs text-gray-600 dark:text-gray-400">Upcoming</span>
                  </div>
                </div>
              </div>

              {/* TASK PANEL */}
              <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-bold text-gray-800 dark:text-gray-200 flex items-center gap-2">
                    <Target className="w-5 h-5 text-indigo-600" />
                    Tasks for {selectedDate}
                  </h3>
          {/* Bottom Section - Charts */}
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 mt-8">
            {/* Learning Hours Chart */}
            <div className="bg-card rounded-xl border border-border p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-main">{t("analytics.learning_hours")}</h3>
                <div className="flex space-x-2">
                  <button className="px-4 py-1 bg-[#FA946D] text-white text-sm rounded-lg">{t("analytics.week")}</button>
                  <button className="px-4 py-1 bg-canvas text-muted text-sm rounded-lg">{t("analytics.month")}</button>
                </div>

                <div className="flex gap-2 mb-6">
  <input
    value={newTask}
    onChange={(e) => setNewTask(e.target.value)}
    onKeyDown={(e) => e.key === "Enter" && addTask()}
    className="w-[65%] border dark:border-gray-700 dark:bg-gray-900 dark:text-white p-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
    placeholder="Add a new task..."
  />

  <button
    onClick={addTask}
    className="w-[35%] bg-indigo-600 hover:bg-indigo-700 text-white px-4 rounded-xl transition flex items-center justify-center gap-1"
  >
    <Plus className="w-4 h-4" />
    Add
  </button>
</div>

                <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                  {(tasks[selectedDate] || []).length > 0 ? (
                    (tasks[selectedDate] || []).map((task, i) => (
                      <div
                        key={i}
                        className={`group relative flex items-center gap-3 p-3 rounded-xl transition-all
                          ${task.status === "Completed" 
                            ? 'bg-green-50 dark:bg-green-900/20' 
                            : 'bg-gray-50 dark:bg-gray-700/50 hover:bg-gray-100 dark:hover:bg-gray-700'
                          }`}
                      >
                        <div className="flex-shrink-0">
                          {statusIcons[task.status]}
                        </div>
                        <span className={`flex-1 text-sm line-clamp-2 ${
                          task.status === "Completed" 
                            ? 'line-through text-gray-500 dark:text-gray-400' 
                            : 'text-gray-700 dark:text-gray-300'
                        }`}>
                          {task.text}
                        </span>
                        
                        <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <select
                            value={task.status}
                            onChange={(e) => updateTaskStatus(i, e.target.value)}
                            className="bg-white dark:bg-gray-800 border dark:border-gray-600 rounded-lg p-1 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500"
                          >
                            <option value="Upcoming">📅 Upcoming</option>
                            <option value="Ongoing">🔄 Ongoing</option>
                            <option value="Completed">✅ Done</option>
                          </select>
                          <button
                            onClick={() => deleteTask(i)}
                            className="text-gray-400 hover:text-red-500 transition p-1"
                            aria-label="Delete task"
                            title="Delete task"
                          >
                            ✕
                          </button>
                        </div>

                        {task.status === "Completed" && (
                          <div className="absolute bottom-0 left-0 h-0.5 bg-green-500 rounded-full w-full"></div>
                        )}
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8">
                      <div className="inline-flex items-center justify-center w-12 h-12 bg-gray-100 dark:bg-gray-700 rounded-full mb-3">
                        <Target className="w-6 h-6 text-gray-400" />
                      </div>
                      <p className="text-gray-500 dark:text-gray-400 text-sm">No tasks for this day</p>
                      <p className="text-xs text-gray-400 mt-1">Add a task to get started</p>
            {/* Course Distribution Chart */}
            <div className="bg-card rounded-xl border border-border p-6">
              <h3 className="text-lg font-semibold text-main mb-6">{t("analytics.course_distribution")}</h3>
              <div className="flex items-center justify-center h-64">
                <div className="relative">
                  {/* Simplified pie chart representation */}
                  <div className="w-40 h-40 rounded-full bg-linear-to-r from-[#3CC3DF] to-[#FA946D] flex items-center justify-center">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-gray-800">{analyticsData?.totalCourses || 0}</div>
                      <div className="text-xs text-gray-600">{t("analytics.total_course")}</div>
                    </div>
                  )}
                </div>

                {/* Task summary */}
                {tasks[selectedDate] && tasks[selectedDate].length > 0 && (
                  <div className="mt-4 pt-4 border-t dark:border-gray-700">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Completed:</span>
                      <span className="font-medium text-green-600">
                        {tasks[selectedDate].filter(t => t.status === "Completed").length}/{tasks[selectedDate].length}
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-1.5 mt-2">
                      <div 
                        className="bg-green-500 h-1.5 rounded-full transition-all duration-300"
                        style={{ width: `${(tasks[selectedDate].filter(t => t.status === "Completed").length / tasks[selectedDate].length) * 100}%` }}
                      ></div>
                    </div>
                  </div>
                )}
              </div>
          {/* Course Performance */}
          <div className="bg-card rounded-xl border border-border p-6 mt-8">
            <h3 className="text-lg font-semibold text-main mb-6">{t("analytics.course_performance")}</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {coursePerformanceData.length > 0 ? coursePerformanceData.map(course => {
                const progressPercentStr = course.progressPercent > 0 ? `${course.progressPercent}%` : '0%';
                return (
                  <div key={course.courseId} className="bg-canvas-alt rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <span className="font-medium text-main">{course.courseTitle}</span>
                      <span className="text-green-600 dark:text-green-400 text-sm font-medium">{progressPercentStr}</span>
                    </div>
                    <div className="w-full bg-border rounded-full h-2 mb-3">
                      <div className="bg-green-600 dark:bg-green-500 h-2 rounded-full" style={{ width: `${course.progressPercent}%` }}></div>
                    </div>
                    <div className="space-y-1 text-sm">
                      <div className="text-muted">{t("analytics.progress_lessons")}: {course.completedLessons}/{course.totalLessons} lessons</div>
                      {/* AI Tip can be added later */}
                    </div>
                  </div>
                );
              }) : (
                <p className="text-muted col-span-3 text-center">{t("analytics.no_courses")}</p>
              )}
            </div>
          )}
        </main>
      </div>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: #f1f1f1;
          border-radius: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #cbd5e0;
          border-radius: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #94a3b8;
        }
        
        @keyframes shimmer {
          0% {
            transform: translateX(-100%);
          }
          100% {
            transform: translateX(100%);
          }
        }
        .animate-shimmer {
          animation: shimmer 2s infinite;
        }
      `}</style>
    </div>
  );
};

export default Analytics;