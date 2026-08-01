import React, { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";

import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import BottomNav from "@/components/BottomNav";
import { PLANS } from "../constants/plans";
import { createOrder } from "../services/paymentService";
import { auth } from "../services/firebase";


type PaymentMethod = "auto";


const PLAN_COLORS: Record<
  string,
  {
    primary: string;
    light: string;
    border: string;
  }
> = {

  quick_start: {
    primary: "#0AA84F",
    light: "#EFFBF4",
    border: "#82D7A4",
  },

  event_pack: {
    primary: "#F27522",
    light: "#FFF8F1",
    border: "#F7B27E",
  },

  professional: {
    primary: "#7353B6",
    light: "#F9F6FF",
    border: "#B7A3E4",
  },

  exhibition_plus: {
    primary: "#08985A",
    light: "#F1FCF7",
    border: "#86D3AC",
  },

};



export default function PlansScreen() {

  const insets = useSafeAreaInsets();


  const [selected, setSelected] =
    useState("quick_start");


  const [loading, setLoading] =
    useState(false);



  const paymentMethod: PaymentMethod = "auto";



  const visiblePlans = useMemo(() => {

    return PLANS.filter(
      (plan) =>
        plan.id !== "free"
    );

  }, []);



  const selectedPlan = useMemo(() => {

    return PLANS.find(
      (plan) =>
        plan.id === selected
    );

  }, [selected]);



  const formatPrice = (
    price:number
  ) => {

    return `₹${price.toLocaleString(
      "en-IN"
    )}`;

  };



  const getPerCardPrice = (
    price:number,
    scans:number
  ) => {

    if(
      price <= 0 ||
      scans <=0
    ){
      return "Included";
    }


    return `₹${(
      price/scans
    ).toFixed(2)} per scan`;

  };



  const handleContinue =
    async () => {

    if(
      !selectedPlan ||
      loading
    ){
      return;
    }


    try{


      setLoading(true);



      const order =
        await createOrder(
          selectedPlan.id
        );



      if(
        !order.key ||
        !order.order_id ||
        !order.amount ||
        !order.currency
      ){

        throw new Error(
          "Incomplete payment order details"
        );

      }



      const user =
        auth.currentUser;



      router.push({

        pathname:"/payment",

        params:{

          key:
            order.key,


          orderId:
            order.order_id,


          amount:
            String(order.amount),


          currency:
            order.currency,


          planId:
            selectedPlan.id,


          planName:
            selectedPlan.name,


          userName:
            user?.displayName || "",


          userEmail:
            user?.email || "",


          userPhone:"",


          paymentMethod,

        },

      });



    }catch(error){


      console.error(
        "Create payment order error:",
        error
      );


      Alert.alert(
        "Unable to continue",
        "We could not create the payment order. Please try again."
      );


    }finally{

      setLoading(false);

    }


  };



  return (

    <SafeAreaView
      style={styles.safeArea}
    >

      <View
        style={styles.container}
      >


        <View
          style={styles.header}
        >


          <TouchableOpacity
            style={styles.backButton}
            onPress={() =>
              router.back()
            }
          >

            <Ionicons
              name="arrow-back"
              size={24}
              color="#20252B"
            />

          </TouchableOpacity>



          <View
            style={styles.headerTextContainer}
          >

            <Text
              style={styles.headerTitle}
            >
              Choose Your Scan Pack
            </Text>


            <Text
              style={styles.headerSubtitle}
            >
              Buy credits once. Scan cards anytime.
            </Text>

          </View>


          <View
            style={styles.headerRightSpace}
          />


        </View>
        
        <ScrollView

          showsVerticalScrollIndicator={false}

          contentContainerStyle={[
            styles.scrollContent,
            {
              paddingBottom:
                175 + insets.bottom,
            },
          ]}

        >


          <View
            style={styles.planList}
          >


            {visiblePlans.map((plan) => {


              const isSelected =
                selected === plan.id;



              const colors =
                PLAN_COLORS[plan.id] ||
                PLAN_COLORS.quick_start;



              const isBestValue =
                plan.id === "event_pack";



              return (

                <TouchableOpacity

                  key={plan.id}

                  activeOpacity={0.88}

                  onPress={() =>
                    setSelected(plan.id)
                  }


                  style={[

                    styles.planCard,


                    {

                      borderColor:
                        isSelected
                        ? colors.primary
                        : colors.border,


                      backgroundColor:
                        isSelected
                        ? colors.light
                        : "#FFFFFF",

                    },


                    isSelected &&
                    styles.selectedPlanCard,


                  ]}


                >



                  {isBestValue && (

                    <View
                      style={
                        styles.bestValueBadge
                      }
                    >

                      <Text
                        style={
                          styles.bestValueText
                        }
                      >

                        Best Value

                      </Text>

                    </View>

                  )}





                  <View
                    style={styles.planTopRow}
                  >



                    <View
                      style={styles.planLeft}
                    >


                      <Text

                        style={[

                          styles.planName,

                          {
                            color:
                              colors.primary,
                          },

                        ]}

                      >

                        {plan.name}

                      </Text>



                      <View
                        style={styles.priceRow}
                      >


                        <Text
                          style={
                            styles.planPrice
                          }
                        >

                          {formatPrice(
                            plan.price
                          )}

                        </Text>


                      </View>



                    </View>






                    <View
                      style={styles.planRight}
                    >



                      <View
                        style={
                          styles.scanInformation
                        }
                      >


                        <Text
                          style={
                            styles.scanCount
                          }
                        >

                          {plan.scans} Scans

                        </Text>




                        <Text
                          style={
                            styles.scanRate
                          }
                        >

                          {getPerCardPrice(
                            plan.price,
                            plan.scans
                          )}

                        </Text>



                      </View>




                      <Ionicons

                        name={
                          isSelected
                          ? "checkmark-circle"
                          : "ellipse-outline"
                        }

                        size={28}

                        color={
                          isSelected
                          ? colors.primary
                          : "#C9D0D5"
                        }

                      />



                    </View>



                  </View>





                  <View
                    style={
                      styles.featurePreview
                    }
                  >


                    <Ionicons

                      name="checkmark"

                      size={18}

                      color={
                        colors.primary
                      }

                    />



                    <Text

                      numberOfLines={1}

                      style={
                        styles.featurePreviewText
                      }

                    >

                      {plan.scans}
                      {" "}
                      business card scans included

                    </Text>



                  </View>



                </TouchableOpacity>


              );


            })}



          </View>



        </ScrollView>






        <View

          style={[

            styles.bottomSection,

            {

              bottom:
                72 + insets.bottom,

            },

          ]}


        >



          <TouchableOpacity

            activeOpacity={0.85}

            disabled={
              loading ||
              !selectedPlan
            }

            onPress={
              handleContinue
            }


            style={[

              styles.continueButton,

              loading &&
              styles.disabledContinueButton,

            ]}


          >



            {loading ? (

              <View
                style={
                  styles.loadingRow
                }
              >

                <ActivityIndicator

                  size="small"

                  color="#FFFFFF"

                />


                <Text
                  style={
                    styles.continueButtonText
                  }
                >

                  Processing...

                </Text>


              </View>


            ) : (


              <Text
                style={
                  styles.continueButtonText
                }
              >

                Continue

              </Text>


            )}



          </TouchableOpacity>



        </View>




        <BottomNav
          active="plans"
        />



      </View>


    </SafeAreaView>


  );


}
const styles = StyleSheet.create({

  safeArea:{
    flex:1,
    backgroundColor:"#FFFFFF",
  },


  container:{
    flex:1,
    backgroundColor:"#FFFFFF",
  },


  header:{

    minHeight:78,

    paddingHorizontal:19,

    flexDirection:"row",

    alignItems:"center",

    backgroundColor:"#FFFFFF",

    borderBottomWidth:1,

    borderBottomColor:"#EFF1F2",

  },


  backButton:{

    width:42,

    height:48,

    alignItems:"flex-start",

    justifyContent:"center",

  },


  headerTextContainer:{

    flex:1,

    marginLeft:2,

  },


  headerRightSpace:{

    width:42,

  },


  headerTitle:{

    color:"#20242A",

    fontSize:21,

    fontWeight:"800",

  },


  headerSubtitle:{

    marginTop:3,

    color:"#8A9097",

    fontSize:13,

    fontWeight:"500",

  },


  scrollContent:{

    paddingTop:20,

    paddingHorizontal:20,

  },


  planList:{

    marginTop:5,

    gap:15,

  },


  planCard:{

    position:"relative",

    minHeight:142,

    paddingHorizontal:21,

    paddingVertical:19,

    borderRadius:20,

    borderWidth:1.5,

    justifyContent:"center",


    shadowColor:"#1F2937",

    shadowOpacity:0.04,

    shadowRadius:6,

    shadowOffset:{
      width:0,
      height:2,
    },


    elevation:2,

  },


  selectedPlanCard:{

    borderWidth:2.2,


    shadowColor:"#0F7B3D",

    shadowOpacity:0.08,

    shadowRadius:9,


    shadowOffset:{
      width:0,
      height:3,
    },


    elevation:3,

  },


  planTopRow:{

    flexDirection:"row",

    alignItems:"center",

  },


  planLeft:{

    flex:1,

    paddingRight:10,

  },


  planName:{

    fontSize:17,

    fontWeight:"800",

  },


  priceRow:{

    marginTop:11,

    flexDirection:"row",

    alignItems:"baseline",

  },


  planPrice:{

    color:"#1D2228",

    fontSize:29,

    fontWeight:"900",

    letterSpacing:-0.4,

  },


  planRight:{

    minWidth:135,

    flexDirection:"row",

    alignItems:"center",

    justifyContent:"flex-end",

  },


  scanInformation:{

    marginRight:11,

    alignItems:"flex-end",

  },


  scanCount:{

    color:"#2B3036",

    fontSize:15,

    fontWeight:"800",

  },


  scanRate:{

    marginTop:4,

    color:"#8C929A",

    fontSize:11,

    fontWeight:"500",

  },


  featurePreview:{

    marginTop:16,

    flexDirection:"row",

    alignItems:"center",

  },


  featurePreviewText:{

    flex:1,

    marginLeft:7,

    color:"#6F767E",

    fontSize:12.5,

    fontWeight:"600",

  },


  bestValueBadge:{

    position:"absolute",

    top:-12,

    right:18,

    zIndex:5,

    paddingHorizontal:15,

    paddingVertical:5,

    borderRadius:15,

    backgroundColor:"#F4B800",

  },


  bestValueText:{

    color:"#624900",

    fontSize:11,

    fontWeight:"800",

  },


  bottomSection:{

    position:"absolute",

    left:0,

    right:0,

    paddingTop:14,

    paddingHorizontal:20,

    paddingBottom:10,

    backgroundColor:"#FFFFFF",

    borderTopWidth:1,

    borderTopColor:"#EFF1F2",

  },


  continueButton:{

    height:58,

    borderRadius:15,

    backgroundColor:"#09AF4C",

    alignItems:"center",

    justifyContent:"center",


    shadowColor:"#138A3C",

    shadowOpacity:0.21,

    shadowRadius:9,

    shadowOffset:{
      width:0,
      height:4,
    },


    elevation:5,

  },


  disabledContinueButton:{

    opacity:0.7,

  },


  continueButtonText:{

    color:"#FFFFFF",

    fontSize:18,

    fontWeight:"800",

  },


  loadingRow:{

    flexDirection:"row",

    alignItems:"center",

    gap:9,

  },


});