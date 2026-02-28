/**
 * Course.java
 * 
 * Course represents a school course/class.
 * @author Michael Cran
 * @version December 13th, 2021
 */
public class Course {
    
    // int value that holds the max amount of students per course.
    int maxSize = 10;
    
    // String value that holds the course name.
    String course;
    
    // String value that holds the teacher's name.
    String teacher;
    
    // int value that holds the period the course occurs.
    int period;
    
    // array that holds all the students in the course.
    Student[] students = new Student[maxSize];
    
    // array that holds the overall grade of a student in the course.
    double[] grades = new double[maxSize];
    
    // int that holds the current class size.
    int classSize = 0;
    
    /**
     * Creates a new Course instance.
     * 
     * @param course    a String value
     *                  containing the course's name.
     * @param teacher   a String value
     *                  containing the name of the teacher for the course.
     * @param period    a int value
     *                  containing the period the course occurs.
     */
    public Course(String course, String teacher, int period) {
        /* *** TO BE IMPLEMENTED IN ACTIVITY 2 *** */
        this.course = course;
        this.teacher = teacher;
        this.period = period;
    }
    
    /**
     * Enrolls a student in this course.
     * 
     * @param stu   a student value
     *              containing the student to enroll into this course.
     */
    public void enroll(Student stu) {
        /* *** TO BE IMPLEMENTED IN ACTIVITY 2 *** */
        if (classSize <= 10) {
            students[classSize] = stu;
            classSize++;
        }
    }
    
	/**
	 * Accesses this Course's name.
	 * @return this Course's name.
	 */
    public String getCourse() {
        /* *** TO BE IMPLEMENTED IN ACTIVITY 2 *** */
        return course;
    }
    
	/**
	 * Accesses this Course's teacher.
	 * @return this Course's teacher.
	 */
    public String getTeacher() {
        /* *** TO BE IMPLEMENTED IN ACTIVITY 2 *** */
        return teacher;
    }
    
	/**
	 * Accesses this Course's period.
	 * @return this Course's period.
	 */
    public int getPeriod() {
        /* *** TO BE IMPLEMENTED IN ACTIVITY 2 *** */
        return period;
    }

	/**
	 * Accesses this Course's class size.
	 * @return this Course's class size.
	 */
    public int getClassSize() {
        /* *** TO BE IMPLEMENTED IN ACTIVITY 2 *** */
        return classSize;
    }

    /**
     * Sets a Students Grade for this course.
     * 
     * @param stu       a student value
     *                  containing the student to set the grade for.
     * @param grade     a double value
     *                  containing the grade to set for the student.
     */
    public void setGrade(Student stu, double grade) {
        /* *** TO BE IMPLEMENTED IN ACTIVITY 2 *** */
        for(int i = 0; i < classSize; i++) {
            if (students[i] == stu) {
                grades[i] = grade;
            }
        }
    }
    
	/**
	 * Accesses this Course's grade for a specific student.
	 * 
	 * @param stu   a Student value
	 *              containing the student to get the grade for.
	 * @return this Course's grade for a specific student.
	 */
    public double getGrade(Student stu) {
        /* *** TO BE IMPLEMENTED IN ACTIVITY 2 *** */
        for (int i = 0; i < classSize; i++) {
            if (students[i] == stu) {
                return grades[i];
            }
        }
        return -1;
    }

    /**
     * Converts the Course's name, period, class size, and students in the format:
     *      "[PERIOD [PERIOD NUMBER]] [COURSE NAME] by [TEACHER]."
     *      "[CLASS SIZE] Students Enrolled:"
     *       - Student 1 ([GRADE])
     *       - Student 2 ([GRADE])
     *       - ...
     * This provides a useful way of printing the contents of a Course in an easily 
	 * readable format or performing other similar functions.
	 * 
	 * @return a String value containing the name, period, class size, and students of a course.
	 */
    public String toString() {
        /* *** TO BE IMPLEMENTED IN ACTIVITY 2 *** */
        String msg =  "[PERIOD " + getPeriod() + "] " + getCourse() + " by " + getTeacher() + ".";
        msg += "\n" + getClassSize() + " Students Enrolled:";
        for(Student stu : students) {
            if (stu != null) {
                msg += "\n - " + stu.getName() + " (" + getGrade(stu) + "%)";
            }
        }
        return msg;        
    }
}