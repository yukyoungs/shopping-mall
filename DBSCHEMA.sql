/*  PERSON TABLE SCHEMA */  
CREATE TABLE person (
   loginid varchar(10) NOT NULL,
   password varchar(20) NOT NULL,
   name  varchar(20) NOT NULL,
   address varchar(100),
   tel varchar(13), 
   birth varchar(8) NOT NULL,
   class varchar(3) NOT NULL, 
   grade varchar(1) NOT NULL,
   PRIMARY KEY (loginid)
); 

insert into person values('M','M', '관리자', '서울', '010','00000000','MNG','S'); 

SELECT * FROM webdb2024.person;

/*  CODE TABLE SCHEMA */  
CREATE TABLE code (
   main_id varchar(4) NOT NULL,
   sub_id varchar(4) NOT NULL,
   main_name  varchar(20) NOT NULL,
   sub_name varchar(100),
   start varchar(8) NOT NULL,
   end varchar(8) NOT NULL,
   PRIMARY KEY (main_id, sub_id, start)
); 
insert into code 
values('0000','0000','여성 의류', '상의', '20240101','20261231');
insert into code 
values('0000','0001','여성 의류', '아우터', '20240101','20261231');
insert into code 
values('1000','0001','식품', '신선식품', '20240101','99999999');
insert into code 
values('2000','0001','가전', '주방 가전', '20240101','99999999');
insert into code 
values('3000','0001','화장품', '여성', '20240101','99999999');

select * from code;
delete from code;
drop table code;



/*  PRODUCT TABLE SCHEMA */
CREATE TABLE product (
   main_id varchar(4) NOT NULL,
   sub_id varchar(4) NOT NULL,
   mer_id int NOT NULL AUTO_INCREMENT,
   name  varchar(300) NOT NULL,
   price int NOT NULL,
   stock int NOT NULL,
   brand varchar(50) NOT NULL,
   supplier varchar(50) NOT NULL,
   image varchar(50), 
   sale_yn varchar(1) NOT NULL,
   sale_price int,    
   PRIMARY KEY (mer_id)
); 
drop table product;
delete from product;
select * from product;

/*  BOARDTYPE TABLE SCHEMA */
CREATE TABLE boardtype (
   type_id int NOT NULL AUTO_INCREMENT,
   title varchar(200) NOT NULL,
   description varchar(400),
   write_YN varchar(1) NOT NULL,
   re_YN varchar(1) NOT NULL,
   numPerPage int, 
   PRIMARY KEY (type_id)
); 
drop table boardtype;
delete from boardtype;
select * from boardtype;

/*  BOARD TABLE SCHEMA */
CREATE TABLE board (
   type_id int,
   board_id int NOT NULL AUTO_INCREMENT,
   p_id int,
   loginid varchar(10) NOT NULL,
   password varchar(20),
   title varchar(200) NOT NULL,
   date varchar(50),
   content text,
   PRIMARY KEY (board_id)
); 

drop table board;
delete from board;
select * from board;

/*  PURCHASE TABLE SCHEMA */
CREATE TABLE purchase (
   purchase_id int NOT NULL AUTO_INCREMENT,
   loginid varchar(10) NOT NULL,
   mer_id int NOT NULL,
   date varchar(30) NOT NULL,
   price int, 
   point int, 
   qty int, 
   total int, 
   payYN varchar(1) NOT NULL DEFAULT 'N',
   cancel varchar(1) NOT NULL DEFAULT 'N', 
   refund varchar(1) NOT NULL DEFAULT 'N', 
   PRIMARY KEY (purchase_id)
);  

drop table purchase;
delete from purchase;
select * from purchase;

/*  CART TABLE SCHEMA */
CREATE TABLE cart (
   cart_id int NOT NULL AUTO_INCREMENT,
   loginid varchar(10) NOT NULL,
   mer_id int NOT NULL,
   date varchar(30) NOT NULL,
   PRIMARY KEY (cart_id)
);  

select * from cart;
delete from cart;
